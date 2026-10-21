import type { Chapter, SceneId } from "../stage/chapters";

/**
 * The pixel scene's pure parts (pixel move, issue #8, PR 3): what to draw at a reading
 * position, and how to draw it into a square grid of palette indices. No DOM here, so it
 * is unit-tested; src/pixel/PixelScene.tsx paints the grids.
 *
 * Palette indices: 0–3 are the theme's ramp from ink to paper, 4 is the accent.
 */
export const INK = 0;
export const SEPIA = 1;
export const DEEP = 2;
export const PAPER = 3;
export const ACCENT = 4;

/** The resolution every transition passes through: the old scene coarsens to it, the new one sharpens from it. */
export const LOW = 48;
/** How sharp each scene gets when the reader is well inside it. */
export const HIGH: Record<SceneId, number> = { globe: 120, city: 232, street: 240, figure: 320 };
/**
 * Where a change of scene happens between two chapters (halfway), half the wipe's length,
 * and the coarsen/sharpen ramp either side, in chapter units. WIPE_HALF + RAMP stays under
 * half a chapter, so every chapter is fully sharp around its middle.
 */
export const WIPE_AT = 0.5;
export const WIPE_HALF = 0.12;
export const RAMP = 0.3;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]!;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** The site's one curve (power2.inOut, src/stage/motion.ts). */
export const ease = (x: number) => {
  x = clamp01(x);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
};
export const span = (a: number, b: number, x: number) => ease((x - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Resolutions step in eights, so sharpening reads as distinct steps. */
export const step8 = (r: number) => Math.max(LOW, Math.round(r / 8) * 8);

/** A camera inside a square source: the point it centres on (source pixels) and its zoom. */
export type View = { cx: number; cy: number; s: number };

export type GlobeParams = { radius: number; lat0: number; lng0: number; marker: boolean };

/** What the screen shows at one reading position. */
export type SceneFrame = {
  /** The scene drawn, and the one wiping in over it during a transition. */
  a: SceneId;
  b: SceneId | null;
  /** The wipe's progress, 0–1, while `b` is set. */
  k: number;
  res: number;
  /** The figure's camera, for the figure scene. */
  view: View | null;
  /** How much of the circle and square are drawn, 0–1. */
  draw: number;
  globe: GlobeParams;
};

export type FrameOptions = {
  /** Milliseconds, for the globe's idle turn and the marker's blink. */
  time: number;
  /** Calm mode or reduced motion: nothing moves on its own. */
  still: boolean;
  /** The owner's area, for the globe to turn towards. */
  area: { lat: number; lng: number } | null;
  /** The figure camera framing each chapter's region (null: the whole figure). */
  views: (View | null)[];
  /** The whole figure's camera. */
  whole: View;
};

const D = Math.PI / 180;

/** The transitions: midpoints between adjacent chapters whose scenes differ. */
export function boundaries(chapters: Pick<Chapter, "scene">[]): { at: number; from: SceneId; to: SceneId }[] {
  const out: { at: number; from: SceneId; to: SceneId }[] = [];
  for (let i = 0; i < chapters.length - 1; i++) {
    const from = chapters[i]!.scene, to = chapters[i + 1]!.scene;
    if (from !== to) out.push({ at: i + WIPE_AT, from, to });
  }
  return out;
}

/**
 * The frame at reading position `p` (chapter units). The scene comes from the chapter the
 * reader is in; near a change of scene, the old scene coarsens to LOW, a dithered wipe runs
 * top to bottom, and the new one sharpens. Timing comes from the chapters alone.
 */
export function frameAt(p: number, chapters: Pick<Chapter, "scene">[], o: FrameOptions): SceneFrame {
  const cuts = boundaries(chapters);
  const last = chapters.length - 1;
  const i = Math.min(last, Math.max(0, Math.floor(p)));
  const scene = chapters[i]!.scene;

  // The globe turns from its idle spin towards the owner's area, then grows as the first cut nears.
  const firstCut = cuts.find((c) => c.from === "globe")?.at ?? 1;
  const idle = o.still ? -30 : -30 + o.time * 0.006;
  const toward = span(0, Math.max(0.1, firstCut - WIPE_HALF - 0.1), p);
  const target = o.area?.lng ?? idle;
  const delta = ((((target - idle) % 360) + 540) % 360) - 180;
  const globe: GlobeParams = {
    radius: lerp(0.58, 0.7, toward) * lerp(1, 3.4, span(firstCut - WIPE_HALF - RAMP, firstCut, p) ** 1.6),
    lat0: lerp(18, o.area?.lat ?? 18, toward) * D,
    lng0: (idle + delta * toward) * D,
    marker: o.still || p > 0.6 || Math.floor(o.time / 550) % 2 === 0,
  };

  // The figure's camera eases from one chapter's region to the next's.
  const at = (j: number) => o.views[Math.min(last, Math.max(0, j))] ?? o.whole;
  const f = p - i;
  const k = span(0.15, 0.75, f);
  const view = mixView(at(i), at(i + 1), k);
  const draw = span(last - 0.9, last - 0.1, p);

  const near = cuts.reduce<{ at: number; from: SceneId; to: SceneId } | null>((best, c) => (!best || Math.abs(c.at - p) < Math.abs(best.at - p) ? c : best), null);
  if (near && Math.abs(p - near.at) <= WIPE_HALF) {
    return { a: near.from, b: near.to, k: (p - (near.at - WIPE_HALF)) / (2 * WIPE_HALF), res: LOW, view, draw, globe };
  }
  // Which side of the nearest cut the reader is on decides the scene; the distance decides sharpness.
  const shown = near ? (p < near.at ? near.from : near.to) : scene;
  const distance = near ? Math.abs(p - near.at) - WIPE_HALF : Infinity;
  const res = step8(lerp(LOW, HIGH[shown], ease(Math.min(1, distance / RAMP))));
  return { a: shown, b: null, k: 0, res, view, draw, globe };
}

export function mixView(a: View, b: View, k: number): View {
  // Zoom moves geometrically, so a 1× → 3× push feels even all the way in.
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), s: a.s * (b.s / a.s) ** k };
}

/**
 * Frames a region's bounds (source pixels) with a margin, between the whole view's zoom and
 * three times it, kept inside the whole view so the frame never shows paper past the drawing.
 */
export function viewFor(bounds: { x0: number; y0: number; x1: number; y1: number } | null, size: number, whole: View): View {
  if (!bounds) return whole;
  const s = Math.min(3 * whole.s, Math.max(whole.s, Math.min(size / ((bounds.x1 - bounds.x0) * 1.5), size / ((bounds.y1 - bounds.y0) * 1.5))));
  const room = size / (2 * whole.s) - size / (2 * s);
  const keep = (c: number, mid: number) => Math.min(mid + room, Math.max(mid - room, c));
  return { cx: keep((bounds.x0 + bounds.x1) / 2, whole.cx), cy: keep((bounds.y0 + bounds.y1) / 2, whole.cy), s };
}

/** The view that fits a w × h image, centred in its square source. */
export function wholeView(size: number, w: number, h: number): View {
  return { cx: size / 2, cy: size / 2, s: size / Math.max(w, h) };
}

/* ---------- Sources ---------- */

/**
 * A square luminance source with a pyramid of 2× reductions (mean and minimum per level),
 * so any block size reads in constant time: the scene re-samples every scroll frame while
 * the figure's camera moves.
 */
export type Source = { size: number; mean: Float32Array[]; min: Float32Array[] };

/** Builds a source from RGBA pixels, letterboxed onto a power-of-two square of paper. */
export function makeSource(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Source {
  let size = 1;
  while (size < Math.max(w, h)) size *= 2;
  const base = new Float32Array(size * size).fill(1);
  const ox = Math.floor((size - w) / 2), oy = Math.floor((size - h) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      base[(y + oy) * size + x + ox] = (0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!) / 255;
    }
  }
  const mean = [base], min = [base];
  for (let n = size / 2; n >= 1; n /= 2) {
    const pm = mean.at(-1)!, pn = min.at(-1)!, m = new Float32Array(n * n), q = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const a = 2 * y * 2 * n + 2 * x, b = a + 1, c = a + 2 * n, d = c + 1;
        m[y * n + x] = (pm[a]! + pm[b]! + pm[c]! + pm[d]!) / 4;
        q[y * n + x] = Math.min(pn[a]!, pn[b]!, pn[c]!, pn[d]!);
      }
    }
    mean.push(m);
    min.push(q);
  }
  return { size, mean, min };
}

/** A source's offset inside its square, for geometry measured on the original image. */
export function sourceOffset(source: Source, w: number, h: number) {
  return { x: Math.floor((source.size - w) / 2), y: Math.floor((source.size - h) / 2) };
}

/**
 * Samples a source into a res × res grid through a camera, posterised into the four ramp
 * tones by three cuts (flat tones, no dither). Line art ("line") leans on each block's
 * darkest pixel, so thin strokes survive coarse grids.
 */
export function sample(src: Source, res: number, view: View, cuts: [number, number, number], mode: "mean" | "line"): Uint8Array {
  const out = new Uint8Array(res * res);
  const span = src.size / view.s, x0 = view.cx - span / 2, y0 = view.cy - span / 2, block = span / res;
  // Mean reads a level whose texels cover the whole block (no aliasing); line art one step finer, so strokes stay thin.
  const fit = Math.log2(Math.max(1, block));
  const level = Math.min(src.mean.length - 1, Math.max(0, mode === "mean" ? Math.ceil(fit) : Math.round(fit)));
  const n = src.size >> level, scale = 1 << level;
  const mean = src.mean[level]!, min = src.min[level]!;
  for (let y = 0; y < res; y++) {
    const sy = Math.min(n - 1, Math.max(0, Math.floor((y0 + (y + 0.5) * block) / scale)));
    for (let x = 0; x < res; x++) {
      const sx = Math.min(n - 1, Math.max(0, Math.floor((x0 + (x + 0.5) * block) / scale)));
      const i = sy * n + sx;
      const v = mode === "line" ? lerp(mean[i]!, min[i]!, 0.7) : mean[i]!;
      out[y * res + x] = v < cuts[0] ? INK : v < cuts[1] ? SEPIA : v < cuts[2] ? DEEP : PAPER;
    }
  }
  return out;
}

/* ---------- Drawing ---------- */

export function plot(grid: Uint8Array, res: number, x: number, y: number, v: number) {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < res && y < res) grid[y * res + x] = v;
}

/** Maps a source point through a camera to grid coordinates. */
export function toGrid(view: View, size: number, res: number, x: number, y: number): [number, number] {
  const span = size / view.s;
  return [((x - (view.cx - span / 2)) / span) * res, ((y - (view.cy - span / 2)) / span) * res];
}

/** A circle (source pixels), drawn from 12 o'clock for `share` of its length; dashed or solid. */
export function circle(grid: Uint8Array, res: number, view: View, size: number, c: { cx: number; cy: number; r: number }, share: number, dashed: boolean) {
  const pxR = (c.r / (size / view.s)) * res;
  const n = Math.ceil(2 * Math.PI * pxR * 2) + 8;
  for (let i = 0; i <= n * share; i++) {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    if (dashed && Math.floor((a + 10) / (Math.PI / 36)) % 2) continue;
    const [x, y] = toGrid(view, size, res, c.cx + c.r * Math.cos(a), c.cy + c.r * Math.sin(a));
    plot(grid, res, x, y, ACCENT);
  }
}

/** A rectangle's outline (source pixels), drawn clockwise from the top left for `share` of its length. */
export function square(grid: Uint8Array, res: number, view: View, size: number, r: { left: number; top: number; right: number; bottom: number }, share: number) {
  const pts: [number, number][] = [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom], [r.left, r.top]];
  let left = 2 * (r.right - r.left + r.bottom - r.top) * share;
  for (let k = 0; k < 4 && left > 0; k++) {
    const [ax, ay] = pts[k]!, [bx, by] = pts[k + 1]!, len = Math.hypot(bx - ax, by - ay), part = Math.min(1, left / len);
    const n = Math.ceil((len / (size / view.s)) * res * 2 * part) + 1;
    for (let i = 0; i <= n; i++) {
      const [x, y] = toGrid(view, size, res, lerp(ax, bx, (i / n) * part), lerp(ay, by, (i / n) * part));
      plot(grid, res, x, y, ACCENT);
    }
    left -= len;
  }
}

/** Orthographic inverse: the latitude and longitude (radians) under a point on the unit disc, or null off it. */
export function unproject(u: number, v: number, lat0: number, lng0: number): [number, number] | null {
  const rr = u * u + v * v;
  if (rr > 1) return null;
  const rho = Math.sqrt(rr) || 1e-9, c = Math.asin(Math.min(1, rho)), sc = Math.sin(c), cc = Math.cos(c);
  const lat = Math.asin(cc * Math.sin(lat0) + (v * sc * Math.cos(lat0)) / rho);
  const lng = lng0 + Math.atan2(u * sc, rho * cc * Math.cos(lat0) - v * sc * Math.sin(lat0));
  return [lat, lng];
}

/** Orthographic forward: a point on the unit disc, or null on the far side. */
export function project(lat: number, lng: number, lat0: number, lng0: number): [number, number] | null {
  const dl = lng - lng0;
  if (Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(dl) < 0) return null;
  return [Math.cos(lat) * Math.sin(dl), Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(dl)];
}

/** The globe: land from an equirectangular mask (luminance > 0.5 is land), a 30° graticule, lit from the upper left. */
export function renderGlobe(res: number, g: GlobeParams, land: { lum: Float32Array; w: number; h: number }, marker: { lat: number; lng: number } | null): Uint8Array {
  const out = new Uint8Array(res * res);
  const half = res / 2, rim = 1 - 1.4 / (g.radius * half), degPx = 1 / D / (g.radius * half);
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = ((x + 0.5) / half - 1) / g.radius, v = -((y + 0.5) / half - 1) / g.radius, i = y * res + x;
      const ll = unproject(u, v, g.lat0, g.lng0);
      if (!ll) {
        out[i] = PAPER;
        continue;
      }
      if (Math.sqrt(u * u + v * v) > rim) {
        out[i] = INK;
        continue;
      }
      const [lat, lng] = ll;
      const lx = Math.floor((((((lng / D + 180) % 360) + 360) % 360) / 360) * land.w) % land.w;
      const ly = Math.floor(clamp01((90 - lat / D) / 180) * (land.h - 1));
      const z = Math.sqrt(Math.max(0, 1 - u * u - v * v)), light = clamp01(0.25 + 0.55 * z - 0.3 * u + 0.3 * v);
      const tone = light + (bayer(x, y) - 0.5) * 0.4;
      if (land.lum[ly * land.w + lx]! > 0.5) {
        out[i] = tone < 0.3 ? INK : SEPIA;
        continue;
      }
      const la = lat / D, lo = lng / D, w = Math.max(0.4, degPx * 0.55);
      const grid = Math.abs((((la % 30) + 30) % 30) - 15) > 15 - w || Math.abs((((lo % 30) + 30) % 30) - 15) > 15 - w;
      out[i] = grid ? SEPIA : tone < 0.18 ? SEPIA : DEEP;
    }
  }
  if (marker && g.marker) {
    const p = project(marker.lat * D, marker.lng * D, g.lat0, g.lng0);
    if (p) {
      const px = (p[0] * g.radius + 1) * half, py = (1 - p[1] * g.radius) * half, sz = res >= 96 ? 2 : 1;
      for (let dy = 0; dy < sz; dy++) for (let dx = 0; dx < sz; dx++) plot(out, res, px - sz / 2 + dx, py - sz / 2 + dy, ACCENT);
    }
  }
  return out;
}

/** The wipe: the incoming grid replaces the outgoing one top to bottom, through an ordered dither. */
export function wipe(a: Uint8Array, b: Uint8Array, res: number, k: number): Uint8Array {
  const out = new Uint8Array(res * res);
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const i = y * res + x;
      out[i] = 0.75 * (y / res) + 0.25 * bayer(x, y) < k ? b[i]! : a[i]!;
    }
  }
  return out;
}
