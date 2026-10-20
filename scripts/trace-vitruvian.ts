/**
 * Renders the owner's Vitruvian Man scan as the site's figure (PRD §8.2). Leonardo's
 * drawing (c. 1490) is public domain.
 *
 * The figure is the drawing itself, lifted off the paper as ink: every pen line and
 * hatch keeps its own weight, where a vector trace thickened them into blots (owner
 * feedback, 2026-10-20: "make the drawing as well as the outlines a lot better").
 *
 *   1. Crop to the drawing; take the green channel (best for brown ink on yellow paper)
 *   2. At 1600 px: flatten the paper tone, threshold (Otsu), fit the circle and square,
 *      and erase them (they are redrawn as clean primitives), Leonardo's notes and stains:
 *      the result is a mask of where the figure's ink is
 *   3. At full resolution: median-filter the paper grain, then turn darkness into ink
 *      opacity on a soft ramp, so faint strokes stay faint and edges stay smooth
 *   4. Upscale 2.5× the viewBox (zoomed tour stops stay sharp), keep only ink near the
 *      mask and off the circle's and square's own lines, and erase what the fig leaf
 *      covers (src/vitruvian/figLeaf.ts)
 *   5. Write public/assets/vitruvian/figure.webp: ink colour, opacity in the alpha
 *
 * The geometry in src/content/vitruvian.json (viewBox, circle, square) is kept as
 * committed, so the body regions in src/content/regions.json stay aligned. Pass --refit
 * to fit it again from the scan (then re-check the regions at /?edit=regions).
 *
 * Run with `npm run vitruvian:trace`. Options: --in <scan>, --crop x,y,w,h (source px).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { insidePolygon, leafPolygon } from "../src/vitruvian/figLeaf.ts";
import { clipToShapes, contrastStretch, dropStrays, eraseDrawnShapes, fitCircle, fitEdges, flattenBackground, otsu, squareFromEdges, toMask, type Circle, type Edges, type Square } from "./vitruvian/fit.ts";

const { values } = parseArgs({
  options: {
    in: { type: "string", default: "assets-src/vitruvian-source.jpg" },
    // The drawing's area on the default scan (Wikimedia's Luc Viatour photograph, 2258×3070).
    crop: { type: "string", default: "120,300,2020,1990" },
    refit: { type: "boolean", default: false },
  },
});

if (!existsSync(values.in!)) {
  console.error(`No scan at ${values.in}. Place the owner's scan there (see issue tracker), then rerun.`);
  process.exit(1);
}

/** The viewBox width; the figure's coordinates (and the regions) are in these units. */
const VIEW_W = 1600;
/** Raster pixels per viewBox unit: sharp at the tour's 3× zoom on a 2× display. */
const SCALE = 2.5;
/** Ink colour: --ink in src/styles/tokens.css. */
const INK = [0x2b, 0x21, 0x18] as const;
/** The soft ramp from paper to ink, as fractions of Otsu's threshold, and its curve. */
const RAMP = { full: 0.6, none: 0.95, gamma: 0.7 };

const [cx, cy, cw, ch] = values.crop!.split(",").map(Number) as [number, number, number, number];
const scan = sharp(values.in!).extract({ left: cx, top: cy, width: cw, height: ch });

async function greyAt(width: number, median = 0) {
  let image = scan.clone().resize({ width }).extractChannel(1);
  if (median) image = sharp(await image.png().toBuffer()).median(median).extractChannel(0);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  return { grey: new Uint8Array(data), width: info.width, height: info.height };
}

const flatten = ({ grey, width, height }: { grey: Uint8Array; width: number; height: number }) =>
  contrastStretch(flattenBackground(grey, width, height, Math.round(Math.min(width, height) * 0.03)));

// 2. Where the figure's ink is, at viewBox resolution.
const view = await greyAt(VIEW_W);
const { width, height } = view;
const flat = flatten(view);
const threshold = Math.round(otsu(flat) * 0.9);
const mask = toMask(flat, width, height, threshold);
const committed = existsSync("src/content/vitruvian.json") ? JSON.parse(readFileSync("src/content/vitruvian.json", "utf8")) : null;
let geometry: { circle: Circle; square: Square; edges: Edges };
if (committed?.source === "traced" && !values.refit) {
  geometry = committed;
} else {
  const edges = fitEdges(mask);
  const square = squareFromEdges(edges);
  geometry = { circle: fitCircle(mask, square), square, edges };
}
const { circle, square, edges } = geometry;
// Leonardo's pen line is about 0.4% of the drawing wide.
const stroke = Math.max(3, Math.round(Math.min(width, height) * 0.004));
const clipped = clipToShapes(mask, circle, square, stroke * 3);
const erased = eraseDrawnShapes(clipped, circle, edges, stroke);
// The circle's and square's own pen lines: kept out of the image even where figure ink is near.
const outlines = Buffer.from(clipped.data.map((v, i) => (v && !erased.data[i] ? 255 : 0)));
const figure = dropStrays(erased, {
  minArea: stroke * stroke * 40,
  near: stroke * 12,
  baseline: edges.bottom,
  stroke,
});

// 3. Ink opacity at the scan's full resolution.
const full = await greyAt(cw, 3);
const fullFlat = flatten(full);
const t = otsu(fullFlat);
const [dark, light] = [t * RAMP.full, t * RAMP.none];
const opacity = Buffer.alloc(fullFlat.length);
for (let i = 0; i < fullFlat.length; i++) {
  const a = Math.min(1, Math.max(0, (light - fullFlat[i]!) / (light - dark)));
  opacity[i] = Math.round(255 * a ** RAMP.gamma);
}

// 4. Upscale, keep ink near the figure's mask, erase what the fig leaf covers.
const W = Math.round(width * SCALE);
const H = Math.round(height * SCALE);
const raw = (data: Buffer, w: number, h: number) => sharp(data, { raw: { width: w, height: h, channels: 1 } });
const up = await raw(opacity, full.width, full.height).resize(W, H, { kernel: "lanczos3" }).extractChannel(0).raw().toBuffer();
// sharp's erode grows white regions here: the mask, by a few pixels, so faint strokes beside the main lines survive.
const near = await raw(Buffer.from(figure.data.map((v) => (v ? 255 : 0))), width, height)
  .erode(3)
  .resize(W, H, { kernel: "nearest" })
  .blur(2)
  .extractChannel(0)
  .raw()
  .toBuffer();
const leaf = leafPolygon();
const [lx0, lx1, ly0, ly1] = [Math.min(...leaf.map((p) => p[0])), Math.max(...leaf.map((p) => p[0])), Math.min(...leaf.map((p) => p[1])), Math.max(...leaf.map((p) => p[1]))];
const underLeaf = (x: number, y: number) => x > lx0 && x < lx1 && y > ly0 && y < ly1 && insidePolygon([x, y], leaf);
const lines = await raw(outlines, width, height).erode(2).resize(W, H, { kernel: "nearest" }).blur(1.5).extractChannel(0).raw().toBuffer();
const rgba = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const [vx, vy] = [x / SCALE, y / SCALE];
    if (underLeaf(vx, vy)) continue;
    // The square's top edge (the raised fingertips stop short of it) and everything on and
    // below its baseline (the feet stand on it): redrawn, so no pen line or stain stays.
    if (Math.abs(vy - edges.top) < stroke * 0.7 || vy > edges.bottom - stroke * 2.4) continue;
    // Crisp the upscaled edges a little, then keep only ink near the figure.
    const a = Math.min(1, Math.max(0, (up[i]! / 255 - 0.08) / 0.84)) * (near[i]! / 255) * (1 - lines[i]! / 255);
    rgba.set([...INK, Math.round(a * 255)], i * 4);
  }
}

// 5.
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .webp({ quality: 82, alphaQuality: 85, effort: 6 })
  .toFile("public/assets/vitruvian/figure.webp");
writeFileSync(
  "src/content/vitruvian.json",
  `${JSON.stringify({ source: "traced", viewBox: [0, 0, width, height], circle, square, edges }, null, 2)}\n`,
);
console.log(`Wrote public/assets/vitruvian/figure.webp (${W}×${H}) and src/content/vitruvian.json`);
