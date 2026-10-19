/**
 * Builds the globe's data from Natural Earth 110m (via world-atlas), PRD §8.1:
 *   public/assets/globe/coastlines.bin  Float32 xyz pairs (line segments) on a unit sphere
 *   public/assets/globe/land-mask.png   2048×1024 equirectangular land mask (white = land)
 *
 * Run with `npm run globe:data`. The outputs are committed, so builds don't need to rerun it.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { crc32, deflateSync } from "node:zlib";
import { feature, mesh } from "topojson-client";
import { latLngToVector } from "../src/acts/Act1Globe/geo.ts";

const require = createRequire(import.meta.url);
const topology = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const OUT = new URL("../public/assets/globe/", import.meta.url);
mkdirSync(OUT, { recursive: true });

type Point = [number, number]; // [lng, lat]

// ---- Coastlines -------------------------------------------------------------

/** Natural Earth cuts polygons at the antimeridian and the south pole; those edges aren't coast. */
function isCutEdge([lng0, lat0]: Point, [lng1, lat1]: Point) {
  return (Math.abs(lng0) > 179.99 && Math.abs(lng1) > 179.99) || (lat0 < -89.99 && lat1 < -89.99);
}

const MAX_STEP = (0.5 * Math.PI) / 180;
const vertices: number[] = [];
const coast = mesh(topology, topology.objects.land) as unknown as { coordinates: Point[][] };
for (const line of coast.coordinates) {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if (isCutEdge(a, b)) continue;
    const va = latLngToVector(a[1], a[0]);
    const vb = latLngToVector(b[1], b[0]);
    const angle = Math.acos(Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
    const steps = Math.max(1, Math.ceil(angle / MAX_STEP));
    let prev = va;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      // Spherical interpolation keeps long segments on the surface.
      const sin = Math.sin(angle);
      const wa = angle < 1e-9 ? 1 - t : Math.sin((1 - t) * angle) / sin;
      const wb = angle < 1e-9 ? t : Math.sin(t * angle) / sin;
      const next: [number, number, number] = [
        va[0] * wa + vb[0] * wb,
        va[1] * wa + vb[1] * wb,
        va[2] * wa + vb[2] * wb,
      ];
      vertices.push(...prev, ...next);
      prev = next;
    }
  }
}
writeFileSync(new URL("coastlines.bin", OUT), Buffer.from(new Float32Array(vertices).buffer));

// ---- Land mask ----------------------------------------------------------------

const W = 2048;
const H = 1024;
const SUB = 4; // sub-scanlines per pixel row, for anti-aliased edges
const land = feature(topology, topology.objects.land) as unknown as {
  features: { geometry: { type: string; coordinates: Point[][] | Point[][][] } }[];
};
const polygons: Point[][][] = land.features.flatMap(({ geometry }) =>
  geometry.type === "Polygon" ? [geometry.coordinates as Point[][]] : (geometry.coordinates as Point[][][]),
);

/**
 * Makes a ring's longitudes continuous so no edge jumps across the antimeridian. A ring
 * that circles a pole (Antarctica) ends a full turn from where it started; close it by
 * running along the pole so it encloses the polar cap.
 */
function unwrap(ring: Point[]): Point[] {
  const out: Point[] = [];
  let offset = 0;
  for (const [lng, lat] of ring) {
    const prev = out.at(-1);
    if (prev) {
      const delta = lng + offset - prev[0];
      if (delta > 180) offset -= 360;
      else if (delta < -180) offset += 360;
    }
    out.push([lng + offset, lat]);
  }
  const turn = out.at(-1)![0] - out[0]![0];
  if (Math.abs(turn) > 180) {
    const pole = out.reduce((sum, [, lat]) => sum + lat, 0) < 0 ? -90 : 90;
    out.push([out.at(-1)![0], pole], [out[0]![0], pole]);
  }
  return out;
}

const coverage = new Float32Array(W * H);

/** Adds coverage for [x0, x1) on row y, wrapping longitudes around the texture. */
function addSpan(y: number, x0: number, x1: number, weight: number) {
  for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
    const covered = Math.min(x + 1, x1) - Math.max(x, x0);
    const col = ((x % W) + W) % W;
    coverage[y * W + col]! += covered * weight;
  }
}

for (const polygon of polygons) {
  const rings = polygon.map(unwrap);
  for (let y = 0; y < H; y++) {
    for (let s = 0; s < SUB; s++) {
      const lat = 90 - ((y + (s + 0.5) / SUB) / H) * 180;
      const xs: number[] = [];
      for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [lng0, lat0] = ring[j]!;
          const [lng1, lat1] = ring[i]!;
          if (lat0 > lat !== lat1 > lat) {
            const lng = lng0 + ((lat - lat0) / (lat1 - lat0)) * (lng1 - lng0);
            xs.push(((lng + 180) / 360) * W);
          }
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) addSpan(y, xs[k]!, xs[k + 1]!, 1 / SUB);
    }
  }
}

function png(width: number, height: number, gray: Uint8Array) {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // greyscale
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) raw.set(gray.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const gray = Uint8Array.from(coverage, (c) => Math.round(Math.min(1, c) * 255));
writeFileSync(new URL("land-mask.png", OUT), png(W, H, gray));

console.log(`coastlines.bin: ${vertices.length / 6} segments; land-mask.png: ${W}×${H}`);
