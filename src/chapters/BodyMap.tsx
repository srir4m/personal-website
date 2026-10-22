import { useEffect, useRef, useState } from "react";
import { BODY_REGIONS, regionItems } from "../acts/Act5Body/regions";
import { useBodyFocus } from "../pixel/bodyFocus";
import { readPalette, watchPalette } from "../pixel/palette";
import { highlight, wholeView, type View } from "../pixel/scene";
import { figureGrid, loadPixel, paint, regionPolygons, type Loaded } from "../pixel/sources";
import { useStage } from "../stage/store";

/** The regions the reader can open: those with something to read now, and the heart (the vault). */
export const OPEN_REGIONS = BODY_REGIONS.filter((r) => r.id === "heart" || regionItems(r, "now").length > 0);

type Figure = { L: Loaded; whole: View; polygons: Record<string, [number, number][][]> };

function usePixelFigure(): Figure | null {
  const [figure, setFigure] = useState<Figure | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadPixel().then((L) => {
      if (cancelled) return;
      setFigure({ L, whole: wholeView(L.figure.size, L.geo.figure.w, L.geo.figure.h), polygons: regionPolygons(L) });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return figure;
}

/**
 * The figure's regions as pointer targets, in the figure source's pixels and framed like the
 * whole-figure view. The region chips are the keyboard and screen-reader path to the same
 * panels, so these are for the pointer only.
 */
function Hotspots({ figure, className }: { figure: Figure; className: string }) {
  const setRegion = useBodyFocus((s) => s.setRegion);
  const setOpenPanel = useStage((s) => s.setOpenPanel);
  const span = figure.L.figure.size / figure.whole.s;
  const viewBox = `${figure.whole.cx - span / 2} ${figure.whole.cy - span / 2} ${span} ${span}`;
  // Smaller regions last, so the heart sits above the chest that contains it.
  const ordered = [...OPEN_REGIONS].sort((a, b) => area(figure.polygons[b.id]!) - area(figure.polygons[a.id]!));
  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true">
      {ordered.map((region) => (
        <g
          key={region.id}
          className="body-hotspot"
          data-region={region.id}
          onPointerEnter={() => setRegion(region.id)}
          onPointerLeave={() => setRegion(null)}
          onClick={() => setOpenPanel(region.id)}
        >
          {figure.polygons[region.id]!.map((poly, i) => (
            <polygon key={i} points={poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} />
          ))}
        </g>
      ))}
    </svg>
  );
}

function area(polygons: [number, number][][]): number {
  return polygons.reduce((sum, poly) => sum + Math.abs(poly.reduce((s, [x, y], i) => {
    const [nx, ny] = poly[(i + 1) % poly.length]!;
    return s + x * ny - nx * y;
  }, 0)) / 2, 0);
}

/** Wide screens: the hotspots sit exactly over the scene's figure, behind the column. */
export function BodyHotspots() {
  const figure = usePixelFigure();
  return figure ? <Hotspots figure={figure} className="body-hotspots" /> : null;
}

/** The plate's resolution: coarse enough to read as pixels at phone width. */
const PLATE_RES = 176;

/**
 * Narrow screens, where the column covers the scene: the figure as a pixel plate inside the
 * chapter, with the same hotspots and the same red hatch on the region in focus.
 */
export function BodyPlate() {
  const figure = usePixelFigure();
  const canvas = useRef<HTMLCanvasElement>(null);
  const focus = useBodyFocus((s) => s.region);
  const [palette, setPalette] = useState(() => readPalette());
  useEffect(() => watchPalette(() => setPalette(readPalette())), []);
  useEffect(() => {
    if (!figure || !canvas.current) return;
    const base = figureGrid(figure.L, PLATE_RES, figure.whole);
    const grid = focus && figure.polygons[focus] ? highlight(base, PLATE_RES, figure.whole, figure.L.figure.size, figure.polygons[focus]) : base;
    paint(canvas.current, grid, PLATE_RES, palette);
  }, [figure, focus, palette]);
  return (
    <div className="body-plate" data-ready={figure ? "true" : "false"}>
      <canvas ref={canvas} width={PLATE_RES} height={PLATE_RES} aria-hidden="true" />
      {figure && <Hotspots figure={figure} className="body-plate__hotspots" />}
    </div>
  );
}
