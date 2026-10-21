/**
 * Bakes the pixel scene's source frames (pixel move, issue #8, PR 3) into
 * public/assets/pixel/, so the site needs no map engine or tiles at runtime:
 *
 *   city.webp    the owner's metro area from straight above, centred on owner.area
 *   street.webp  the street-level view at owner.area.street (the old descent's dive), tilted
 *   figure.webp  the Vitruvian figure in ink, with its fig leaf, on paper
 *   pixel.json   each frame's size, and the geometry the scene draws over it (in its pixels)
 *
 * The map frames are the descent's MapLibre style over the self-hosted tiles, rendered by
 * a dev-only page (scripts/bake/map.html) with no ring, hatch or highlight: owner decision
 * on #8, the street frame names the place only. Map data © OpenStreetMap contributors.
 *
 * Run with `npm run pixel:bake` after changing owner.area, the map style, or the figure.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";
import { createServer } from "vite";
import { AREA_RADIUS_KM, STREET, zoomForRing } from "../src/acts/Descent/camera.ts";
import { figLeafMarkup } from "../src/vitruvian/figLeaf.ts";

const OUT = "public/assets/pixel";
/** The map frames' size; the scene samples them at up to a few hundred pixels. */
const SIZE = 800;
/** The metro ring's radius in the city frame, as a share of its width. */
const RING = 0.37;
const PAPER = "#efe4cc";
const INK = "#2b2118";

const content = JSON.parse(readFileSync("src/content/site-content.json", "utf8"));
const area = content.owner.area as { lat: number; lng: number; street?: { lat: number; lng: number } | null } | null;
if (!area) throw new Error("owner.area is empty: there is no place to bake.");
const street = area.street ?? null;
mkdirSync(OUT, { recursive: true });

// The map frames, rendered by the dev-only page through Vite.
const server = await createServer({ server: { port: 4199, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
await page.goto("http://localhost:4199/scripts/bake/map.html");
await page.waitForFunction(() => "shoot" in window);

async function bake(name: string, shot: { lng: number; lat: number; zoom: number; pitch: number; bearing: number }) {
  await page.evaluate((s) => (window as unknown as { shoot: (s: unknown) => Promise<void> }).shoot(s), shot);
  const png = await page.screenshot();
  await sharp(png).webp({ quality: 88 }).toFile(`${OUT}/${name}.webp`);
  console.log(`  ${name}.webp  zoom ${shot.zoom.toFixed(2)}, pitch ${shot.pitch}, bearing ${shot.bearing}`);
}

const ringPx = SIZE * RING;
await bake("city", { lng: area.lng, lat: area.lat, zoom: zoomForRing(ringPx, area.lat, AREA_RADIUS_KM), pitch: 0, bearing: 0 });
if (street) await bake("street", { lng: street.lng, lat: street.lat, zoom: STREET.zoom, pitch: STREET.pitch, bearing: STREET.bearing });
await browser.close();
await server.close();

// The figure: the ink image with its fig leaf, flattened onto paper at half the viewBox.
const geometry = JSON.parse(readFileSync("src/content/vitruvian.json", "utf8"));
const [, , vw, vh] = geometry.viewBox as number[];
const edges = geometry.edges ?? {
  left: geometry.square.x,
  top: geometry.square.y,
  right: geometry.square.x + geometry.square.size,
  bottom: geometry.square.y + geometry.square.size,
};
const k = 0.5;
const [fw, fh] = [Math.round(vw! * k), Math.round(vh! * k)];
const ink = await sharp("public/assets/vitruvian/figure.webp").png().toBuffer();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}" viewBox="0 0 ${vw} ${vh}" color="${INK}">
  <rect width="${vw}" height="${vh}" fill="${PAPER}"/>
  <image href="data:image/png;base64,${ink.toString("base64")}" width="${vw}" height="${vh}"/>
  ${figLeafMarkup(PAPER)}
</svg>`;
await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(`${OUT}/figure.webp`);
console.log(`  figure.webp  ${fw}×${fh}`);

const round = (v: number) => Math.round(v * 10) / 10;
const manifest = {
  city: { w: SIZE, h: SIZE, ring: { cx: SIZE / 2, cy: SIZE / 2, r: round(ringPx) } },
  street: street ? { w: SIZE, h: SIZE } : null,
  figure: {
    w: fw,
    h: fh,
    circle: { cx: round(geometry.circle.cx * k), cy: round(geometry.circle.cy * k), r: round(geometry.circle.r * k) },
    square: { left: round(edges.left * k), top: round(edges.top * k), right: round(edges.right * k), bottom: round(edges.bottom * k) },
  },
  credit: "Map data © OpenStreetMap contributors · Protomaps",
};
writeFileSync(`${OUT}/pixel.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${OUT}/{city,street,figure}.webp and pixel.json`);
