/**
 * Traces the owner's Vitruvian Man scan into SVG (PRD §8.2). Leonardo's drawing (c. 1490)
 * is public domain.
 *
 *   1. Crop to the drawing, then greyscale (green channel: best for brown ink on yellow paper)
 *   2. Flatten the paper tone, contrast stretch, threshold (Otsu)
 *   3. Fit the circle and square; drop ink outside them (Leonardo's notes, stains);
 *      erase the two outlines, which are redrawn as clean primitives
 *      by tracking each wobbling pen line, then drop stray specks
 *   4. Vectorise the rest with potrace → public/assets/vitruvian/figure.svg
 *
 * Also writes src/content/vitruvian.json (viewBox, circle, square). Region polygons in
 * src/content/regions.json are in normalised figure coordinates, so after tracing a new
 * scan, re-check them in the region editor (`npm run dev`, then open /?edit=regions).
 *
 * Run with `npm run vitruvian:trace`. Options: --in <scan>, --crop x,y,w,h (source px),
 * --max-size <px> (downscale before tracing), --turd-size <px²> (drop specks smaller than this).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Jimp } from "jimp";
import potrace from "potrace";
import { clipToShapes, contrastStretch, dropStrays, eraseDrawnShapes, fitCircle, fitEdges, flattenBackground, otsu, squareFromEdges, toMask } from "./vitruvian/fit.ts";

const { values } = parseArgs({
  options: {
    in: { type: "string", default: "assets-src/vitruvian-source.jpg" },
    // The drawing's area on the default scan (Wikimedia's Luc Viatour photograph, 2258×3070).
    crop: { type: "string", default: "120,300,2020,1990" },
    "max-size": { type: "string", default: "1600" },
    "turd-size": { type: "string", default: "50" },
    // Below 1, Otsu's threshold is made stricter, so faint stains and paper grain drop out.
    "threshold-bias": { type: "string", default: "0.9" },
  },
});

if (!existsSync(values.in!)) {
  console.error(`No scan at ${values.in}. Place the owner's scan there (see issue tracker), then rerun.`);
  process.exit(1);
}

const image = await Jimp.read(values.in!);
if (values.crop) {
  const [x, y, w, h] = values.crop.split(",").map(Number) as [number, number, number, number];
  image.crop({ x, y, w: Math.min(w, image.bitmap.width - x), h: Math.min(h, image.bitmap.height - y) });
}
const maxSize = Number(values["max-size"]);
if (Math.max(image.bitmap.width, image.bitmap.height) > maxSize) image.scaleToFit({ w: maxSize, h: maxSize });
const { width, height, data } = image.bitmap;

const grey = new Uint8Array(width * height);
for (let i = 0; i < grey.length; i++) {
  grey[i] = data[i * 4 + 1]!;
}
const flat = flattenBackground(grey, width, height, Math.round(Math.min(width, height) * 0.03));
const stretched = contrastStretch(flat);
const mask = toMask(stretched, width, height, Math.round(otsu(stretched) * Number(values["threshold-bias"])));
const edges = fitEdges(mask);
const square = squareFromEdges(edges);
const circle = fitCircle(mask, square);
// Leonardo's pen line is about 0.4% of the drawing wide.
const stroke = Math.max(3, Math.round(Math.min(width, height) * 0.004));
const cleaned = dropStrays(eraseDrawnShapes(clipToShapes(mask, circle, square, stroke * 3), circle, edges, stroke), {
  minArea: stroke * stroke * 40,
  near: stroke * 12,
  baseline: edges.bottom,
  stroke,
});
console.log(`edges ${JSON.stringify(edges)}\nsquare ${JSON.stringify(square)}\ncircle ${JSON.stringify(circle)}`);

const bitmap = new Jimp({ width, height, color: 0xffffffff });
for (let i = 0; i < cleaned.data.length; i++) {
  if (cleaned.data[i]) bitmap.bitmap.data.set([0, 0, 0, 255], i * 4);
}
const png = await bitmap.getBuffer("image/png");

const svg: string = await new Promise((resolve, reject) =>
  potrace.trace(png, { turdSize: Number(values["turd-size"]), optTolerance: 0.5, threshold: 128, color: "currentColor", background: "transparent" }, (error: Error | null, out: string) =>
    error ? reject(error) : resolve(out),
  ),
);
const paths = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);

mkdirSync("public/assets/vitruvian", { recursive: true });
writeFileSync(
  "public/assets/vitruvian/figure.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" data-source="traced">
  <g id="figure" fill="currentColor" fill-rule="evenodd" stroke="none">
    ${paths.map((d) => `<path d="${d}"/>`).join("\n    ")}
  </g>
</svg>
`,
);
writeFileSync(
  "src/content/vitruvian.json",
  `${JSON.stringify({ source: "traced", viewBox: [0, 0, width, height], circle, square, edges }, null, 2)}\n`,
);
console.log("Wrote public/assets/vitruvian/figure.svg and src/content/vitruvian.json");
