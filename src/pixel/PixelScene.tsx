import { useEffect, useRef } from "react";
import { content } from "../content";
import { text } from "../content/text";
import type { SceneId } from "../stage/chapters";
import { CHAPTERS } from "../stage/chapters";
import { useStage } from "../stage/store";
import { readPalette, watchPalette } from "./palette";
import { circle, frameAt, highlight, renderGlobe, sample, sourceOffset, square, wholeView, wipe, type View } from "./scene";
import { chapterViews, CUTS, loadPixel, regionPolygons, type Loaded } from "./sources";
import { useBodyFocus } from "./bodyFocus";

const area = content.owner.area ? { lat: content.owner.area.lat, lng: content.owner.area.lng } : null;
/** What the readout calls each scene: facts from site-content.json only. */
const LABELS: Record<SceneId, string> = {
  globe: "Earth",
  city: (content.owner.area && text(content.owner.area.label)) ?? "",
  street: text(content.education.location?.label) ?? (content.owner.area && text(content.owner.area.label)) ?? "",
  figure: text(content.owner.name) ?? "",
};
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
    let polygons: Record<string, [number, number][][]> = {};
    /** The region hatched on the figure: the body map's focus, only while its chapter is read. */
    let focus: string | null = null;

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
    const figureGrid = (f: ReturnType<typeof frameAt>) => {
      const g = grid("figure", f);
      if (!focus || !polygons[focus]) return g;
      const view = f.view ?? views!.whole;
      return cached(`hatch:${focus}:${f.res}:${view.cx.toFixed(1)}:${view.cy.toFixed(1)}:${view.s.toFixed(3)}:${f.draw.toFixed(3)}`, () => highlight(g, f.res, view, L!.figure.size, polygons[focus!]!));
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!L || !views || !canvas.current) return;
      const { chapterP, motion, activeChapter } = useStage.getState();
      focus = CHAPTERS[activeChapter]?.kind === "body" ? useBodyFocus.getState().region : null;
      const still = motion === "calm";
      const f = frameAt(chapterP, CHAPTERS, { time: now, still, area, views: views.views, whole: views.whole });
      const globeKey = f.a === "globe" || f.b === "globe" ? `${f.globe.lng0.toFixed(3)}:${f.globe.lat0.toFixed(3)}:${f.globe.radius.toFixed(3)}:${f.globe.marker}` : "";
      const viewKey = f.view ? `${f.view.cx.toFixed(1)}:${f.view.cy.toFixed(1)}:${f.view.s.toFixed(3)}` : "";
      const key = `${f.a}|${f.b}|${f.res}|${f.k.toFixed(3)}|${f.draw.toFixed(3)}|${globeKey}|${viewKey}|${focus}`;
      if (key === last) return;
      last = key;
      const pick = (scene: SceneId) => (scene === "figure" ? figureGrid(f) : grid(scene, f));
      const A = pick(f.a);
      const out = f.b ? wipe(A, pick(f.b), f.res, f.k) : A;
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

    loadPixel()
      .then((loaded) => {
        if (cancelled) return;
        L = loaded;
        views = chapterViews(loaded);
        polygons = regionPolygons(loaded);
        host.current?.setAttribute("data-ready", "true");
      })
      .catch((error: unknown) => console.error("Pixel scene:", error));
    raf = requestAnimationFrame(tick);

    // Dark mode swaps the colour tokens, and only once the page is marked as the pixel layout
    // (App sets data-layout after this effect runs): re-read them and repaint on either change.
    const unwatch = watchPalette(() => {
      palette = readPalette();
      last = "";
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      unwatch();
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
