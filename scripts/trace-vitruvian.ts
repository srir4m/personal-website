/**
 * Traces the owner's Vitruvian Man scan into SVG (PRD §8.2). Leonardo's drawing (c. 1490)
 * is public domain.
 *
 *   1. Greyscale  2. Contrast stretch  3. Threshold (Otsu)
 *   4. Fit and erase the circle and square, which are redrawn as clean primitives
 *   5. Vectorise the rest with potrace → public/assets/vitruvian/figure.svg
 *
 * Also writes src/content/vitruvian.json (viewBox, circle, square). Region polygons in
 * src/content/regions.json are in normalised figure coordinates, so after tracing a new
 * scan, re-check them in the region editor (`npm run dev`, then open /?edit=regions).
 *
 * Run with `npm run vitruvian:trace [-- --in assets-src/vitruvian-source.jpg]`.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Jimp } from "jimp";
import potrace from "potrace";
import { contrastStretch, eraseShapes, fitCircle, fitSquare, otsu, toMask } from "./vitruvian/fit.ts";

const { values } = parseArgs({
  options: {
    in: { type: "string", default: "assets-src/vitruvian-source.jpg" },
    "max-size": { type: "string", default: "2400" },
  },
});

if (!existsSync(values.in!)) {
  console.error(`No scan at ${values.in}. Place the owner's scan there (see issue tracker), then rerun.`);
  process.exit(1);
}

const image = await Jimp.read(values.in!);
const maxSize = Number(values["max-size"]);
if (Math.max(image.bitmap.width, image.bitmap.height) > maxSize) image.scaleToFit({ w: maxSize, h: maxSize });
const { width, height, data } = image.bitmap;

const grey = new Uint8Array(width * height);
for (let i = 0; i < grey.length; i++) {
  grey[i] = Math.round(0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!);
}
const stretched = contrastStretch(grey);
const mask = toMask(stretched, width, height, otsu(stretched));
const square = fitSquare(mask);
const circle = fitCircle(mask, square);
const band = Math.max(3, Math.round(Math.min(width, height) * 0.004));
const cleaned = eraseShapes(mask, circle, square, band);
console.log(`square ${JSON.stringify(square)}\ncircle ${JSON.stringify(circle)}`);

const bitmap = new Jimp({ width, height, color: 0xffffffff });
for (let i = 0; i < cleaned.data.length; i++) {
  if (cleaned.data[i]) bitmap.bitmap.data.set([0, 0, 0, 255], i * 4);
}
const png = await bitmap.getBuffer("image/png");

const svg: string = await new Promise((resolve, reject) =>
  potrace.trace(png, { turdSize: 8, optTolerance: 0.4, threshold: 128, color: "currentColor", background: "transparent" }, (error: Error | null, out: string) =>
    error ? reject(error) : resolve(out),
  ),
);
const paths = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);

mkdirSync("public/assets/vitruvian", { recursive: true });
writeFileSync(
  "public/assets/vitruvian/figure.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" data-source="traced">
  <g id="figure" fill="currentColor" stroke="none">
    ${paths.map((d) => `<path d="${d}"/>`).join("\n    ")}
  </g>
</svg>
`,
);
writeFileSync(
  "src/content/vitruvian.json",
  `${JSON.stringify({ source: "traced", viewBox: [0, 0, width, height], circle, square }, null, 2)}\n`,
);
console.log("Wrote public/assets/vitruvian/figure.svg and src/content/vitruvian.json");
