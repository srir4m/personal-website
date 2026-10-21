import { useEffect, useRef } from "react";
import { content } from "../content";
import { text } from "../content/text";
import { BODY_REGIONS } from "../acts/Act5Body/regions";
import type { SceneId } from "../stage/chapters";
import { CHAPTERS } from "../stage/chapters";
import { useStage } from "../stage/store";
import { circle, frameAt, makeSource, renderGlobe, sample, sourceOffset, square, viewFor, wholeView, wipe, type Source, type View } from "./scene";

/** public/assets/pixel/pixel.json, written by `npm run pixel:bake` (scripts/bake-pixel.ts). */
type PixelGeometry = {
  city: { w: number; h: number; ring: { cx: number; cy: number; r: number } };
  street: { w: number; h: number };
  figure: { w: number; h: number; circle: { cx: number; cy: number; r: number }; square: { left: number; top: number; right: number; bottom: number } };
  credit: string;
};

type Loaded = {
  geo: PixelGeometry;
  land: { lum: Float32Array; w: number; h: number };
  city: Source;
  street: Source | null;
  figure: Source;
};

const base = import.meta.env.BASE_URL;
const area = content.owner.area ? { lat: content.owner.area.lat, lng: content.owner.area.lng } : null;
/** What the readout calls each scene: facts from site-content.json only. */
const LABELS: Record<SceneId, string> = {
  globe: "Earth",
  city: (content.owner.area && text(content.owner.area.label)) ?? "",
  street: text(content.education.location?.label) ?? (content.owner.area && text(content.owner.area.label)) ?? "",
  figure: text(content.owner.name) ?? "",
};
/** Posterising cuts per source: where luminance splits into ink, sepia, deep paper and paper. */
const CUTS: Record<"city" | "street" | "figure", [number, number, number]> = {
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

async function load(): Promise<Loaded> {
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

/** The theme's ramp and accent as RGB, read from the colour tokens (they change with dark mode). */
function readPalette(): [number, number, number][] {
  const probe = document.createElement("canvas").getContext("2d")!;
  const style = getComputedStyle(document.documentElement);
  return ["--ink", "--sepia", "--parchment-deep", "--parchment", "--sanguine"].map((token) => {
    probe.fillStyle = "#000";
    probe.fillStyle = style.getPropertyValue(token).trim() || "#000";
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return [r!, g!, b!];
  });
}

/** The figure camera for each chapter: its region framed, or the whole figure. */
function chapterViews(L: Loaded): { views: (View | null)[]; whole: View } {
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

/**
 * The pixel scene (pixel move, issue #8, PR 3): one canvas behind the chapter column that
 * zooms from the Earth to the owner's area, the campus street and the figure, sharpening
 * as the reader goes in. It follows the store's chapterP; it never re-renders React.
 */
export function PixelScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLElement>(null);
  const res = useRef<HTMLElement>(null);
  const credit = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let L: Loaded | null = null;
    let palette = readPalette();
    let raf = 0, last = "", image: ImageData | null = null;
    let cancelled = false;
    const cache = new Map<string, Uint8Array>();
    const cached = (key: string, make: () => Uint8Array) => {
      let grid = cache.get(key);
      if (!grid) {
        if (cache.size > 64) cache.clear();
        grid = make();
        cache.set(key, grid);
      }
      return grid;
    };
    let views: { views: (View | null)[]; whole: View } | null = null;

    const grid = (scene: SceneId, f: ReturnType<typeof frameAt>): Uint8Array => {
      const { geo } = L!;
      if (scene === "globe") return renderGlobe(f.res, f.globe, L!.land, area);
      if (scene === "city") {
        return cached(`city:${f.res}`, () => {
          const whole = wholeView(L!.city.size, geo.city.w, geo.city.h), off = sourceOffset(L!.city, geo.city.w, geo.city.h);
          const g = sample(L!.city, f.res, whole, CUTS.city, "mean");
          circle(g, f.res, whole, L!.city.size, { cx: geo.city.ring.cx + off.x, cy: geo.city.ring.cy + off.y, r: geo.city.ring.r }, 1, true);
          return g;
        });
      }
      if (scene === "street" && L!.street) {
        return cached(`street:${f.res}`, () => sample(L!.street!, f.res, wholeView(L!.street!.size, geo.street.w, geo.street.h), CUTS.street, "mean"));
      }
      const view = f.view ?? views!.whole;
      return cached(`figure:${f.res}:${view.cx.toFixed(1)}:${view.cy.toFixed(1)}:${view.s.toFixed(3)}:${f.draw.toFixed(3)}`, () => {
        const g = sample(L!.figure, f.res, view, CUTS.figure, "line");
        if (f.draw > 0) {
          const off = sourceOffset(L!.figure, geo.figure.w, geo.figure.h), c = geo.figure.circle, s = geo.figure.square;
          circle(g, f.res, view, L!.figure.size, { cx: c.cx + off.x, cy: c.cy + off.y, r: c.r }, f.draw, false);
          square(g, f.res, view, L!.figure.size, { left: s.left + off.x, top: s.top + off.y, right: s.right + off.x, bottom: s.bottom + off.y }, f.draw);
        }
        return g;
      });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!L || !views || !canvas.current) return;
      const { chapterP, motion } = useStage.getState();
      const still = motion === "calm";
      const f = frameAt(chapterP, CHAPTERS, { time: now, still, area, views: views.views, whole: views.whole });
      const globeKey = f.a === "globe" || f.b === "globe" ? `${f.globe.lng0.toFixed(3)}:${f.globe.lat0.toFixed(3)}:${f.globe.radius.toFixed(3)}:${f.globe.marker}` : "";
      const viewKey = f.view ? `${f.view.cx.toFixed(1)}:${f.view.cy.toFixed(1)}:${f.view.s.toFixed(3)}` : "";
      const key = `${f.a}|${f.b}|${f.res}|${f.k.toFixed(3)}|${f.draw.toFixed(3)}|${globeKey}|${viewKey}`;
      if (key === last) return;
      last = key;
      const A = grid(f.a, f);
      const out = f.b ? wipe(A, grid(f.b, f), f.res, f.k) : A;
      const c = canvas.current;
      if (c.width !== f.res) {
        c.width = c.height = f.res;
        image = null;
      }
      const ctx = c.getContext("2d")!;
      image ??= ctx.createImageData(f.res, f.res);
      const d = image.data;
      for (let i = 0; i < out.length; i++) {
        const rgb = palette[out[i]!]!;
        d[i * 4] = rgb[0];
        d[i * 4 + 1] = rgb[1];
        d[i * 4 + 2] = rgb[2];
        d[i * 4 + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      const shown = f.b && f.k > 0.5 ? f.b : f.a;
      if (label.current) label.current.textContent = LABELS[shown];
      if (res.current) res.current.textContent = `${f.res} × ${f.res} px`;
      if (credit.current) credit.current.textContent = shown === "city" || shown === "street" ? L.geo.credit : "";
      host.current?.setAttribute("data-scene", shown);
    };

    load()
      .then((loaded) => {
        if (cancelled) return;
        L = loaded;
        views = chapterViews(loaded);
        host.current?.setAttribute("data-ready", "true");
      })
      .catch((error: unknown) => console.error("Pixel scene:", error));
    raf = requestAnimationFrame(tick);

    // Dark mode swaps the colour tokens, and only once the page is marked as the pixel layout
    // (App sets data-layout after this effect runs): re-read them and repaint on either change.
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const repaint = () => {
      palette = readPalette();
      last = "";
    };
    scheme.addEventListener("change", repaint);
    const layout = new MutationObserver(repaint);
    layout.observe(document.documentElement, { attributes: true, attributeFilter: ["data-layout"] });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      scheme.removeEventListener("change", repaint);
      layout.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={host} id="pixel-scene" className="pixel-scene" aria-hidden="true">
        <canvas ref={canvas} width={48} height={48} />
      </div>
      <p className="pixel-readout" aria-hidden="true">
        <b ref={label}>{LABELS.globe}</b>
        <span ref={res} />
        <span ref={credit} />
      </p>
    </>
  );
}
