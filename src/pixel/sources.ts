import { BODY_REGIONS } from "../acts/Act5Body/regions";
import { CHAPTERS } from "../stage/chapters";
import { makeSource, sourceOffset, viewFor, wholeView, type Source, type View } from "./scene";

/*
 * The pixel layout's sources (pixel move, issue #8): the baked frames and their geometry,
 * loaded once and shared by the scene behind the column and the body map's plate.
 */
/** public/assets/pixel/pixel.json, written by `npm run pixel:bake` (scripts/bake-pixel.ts). */
export type PixelGeometry = {
  city: { w: number; h: number; ring: { cx: number; cy: number; r: number } };
  street: { w: number; h: number };
  figure: { w: number; h: number; circle: { cx: number; cy: number; r: number }; square: { left: number; top: number; right: number; bottom: number } };
  credit: string;
};

export type Loaded = {
  geo: PixelGeometry;
  land: { lum: Float32Array; w: number; h: number };
  city: Source;
  street: Source | null;
  figure: Source;
};

const base = import.meta.env.BASE_URL;

/** Posterising cuts per source: where luminance splits into ink, sepia, deep paper and paper. */
export const CUTS: Record<"city" | "street" | "figure", [number, number, number]> = {
  city: [0.45, 0.7, 0.86],
  street: [0.5, 0.74, 0.88],
  figure: [0.3, 0.5, 0.82],
};

function image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`${src} failed to load`));
    img.src = src;
  });
}

function pixels(img: HTMLImageElement, w = img.naturalWidth, h = img.naturalHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

async function loadOnce(): Promise<Loaded> {
  const geo = (await fetch(`${base}assets/pixel/pixel.json`).then((r) => r.json())) as PixelGeometry;
  const hasStreet = CHAPTERS.some((c) => c.scene === "street");
  const [landImg, cityImg, figureImg, streetImg] = await Promise.all([
    image(`${base}assets/globe/land-mask.png`),
    image(`${base}assets/pixel/city.webp`),
    image(`${base}assets/pixel/figure.webp`),
    hasStreet ? image(`${base}assets/pixel/street.webp`) : Promise.resolve(null),
  ]);
  const lw = 1024, lh = 512, landRgba = pixels(landImg, lw, lh), lum = new Float32Array(lw * lh);
  for (let i = 0; i < lum.length; i++) lum[i] = landRgba[i * 4]! / 255;
  return {
    geo,
    land: { lum, w: lw, h: lh },
    city: makeSource(pixels(cityImg), cityImg.naturalWidth, cityImg.naturalHeight),
    street: streetImg && makeSource(pixels(streetImg), streetImg.naturalWidth, streetImg.naturalHeight),
    figure: makeSource(pixels(figureImg), figureImg.naturalWidth, figureImg.naturalHeight),
  };
}

/** The figure camera for each chapter: its region framed, or the whole figure. */
export function chapterViews(L: Loaded): { views: (View | null)[]; whole: View } {
  const { figure, geo } = L;
  const whole = wholeView(figure.size, geo.figure.w, geo.figure.h);
  const off = sourceOffset(figure, geo.figure.w, geo.figure.h);
  // Region polygons are in the drawing's viewBox units; the baked figure is that viewBox at its own size.
  const k = geo.figure.w / 1600;
  const views = CHAPTERS.map((chapter) => {
    const region = chapter.region && BODY_REGIONS.find((r) => r.id === chapter.region);
    if (!region) return null;
    const pts = region.polygons.flat();
    const xs = pts.map((p) => p[0] * k + off.x), ys = pts.map((p) => p[1] * k + off.y);
    return viewFor({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }, figure.size, whole);
  });
  return { views, whole };
}


let pending: Promise<Loaded> | null = null;
/** Loads the sources once; every caller shares the same promise. */
export function loadPixel(): Promise<Loaded> {
  pending ??= loadOnce();
  return pending;
}

/** Each body region's polygons in the figure source's pixels (region polygons are in the drawing's viewBox units). */
export function regionPolygons(L: Loaded): Record<string, [number, number][][]> {
  const { figure, geo } = L;
  const off = sourceOffset(figure, geo.figure.w, geo.figure.h);
  const k = geo.figure.w / 1600;
  return Object.fromEntries(BODY_REGIONS.map((r) => [r.id, r.polygons.map((poly) => poly.map(([x, y]) => [x * k + off.x, y * k + off.y] as [number, number]))]));
}

/** Paints a grid of palette indices into a canvas, resizing it to the grid. */
export function paint(canvas: HTMLCanvasElement, grid: Uint8Array, res: number, palette: [number, number, number][]) {
  if (canvas.width !== res) canvas.width = canvas.height = res;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(res, res);
  const d = image.data;
  for (let i = 0; i < grid.length; i++) {
    const rgb = palette[grid[i]!]!;
    d[i * 4] = rgb[0];
    d[i * 4 + 1] = rgb[1];
    d[i * 4 + 2] = rgb[2];
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
