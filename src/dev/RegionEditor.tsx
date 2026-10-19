import { useMemo, useRef, useState } from "react";
import initial from "../content/regions.json";
import { BODY_REGION_IDS, MASK_IDS, type Polygon, type RegionsFile, type ShapeKey } from "../content/regionsSchema";
import { FIGURE_MARKUP, FRAME, VIEWBOX, VITRUVIAN } from "../vitruvian/figure";

const [, , VB_W, VB_H] = VITRUVIAN.viewBox;
const KEYS: ShapeKey[] = [
  ...BODY_REGION_IDS.map((id) => ({ kind: "regions" as const, id })),
  ...MASK_IDS.map((id) => ({ kind: "masks" as const, id })),
];
const label = (key: ShapeKey) => (key.kind === "masks" ? `mask · ${key.id}` : key.id);
const same = (a: ShapeKey, b: ShapeKey) => a.kind === b.kind && a.id === b.id;

/**
 * Dev-only region editor (PRD §8.2), at `/?edit=regions`. Click to add points to the
 * selected polygon, drag a point to move it, shift-click a point to delete it. Save
 * writes src/content/regions.json through the dev server; Copy gives the JSON.
 */
export default function RegionEditor() {
  const [data, setData] = useState<RegionsFile>(() => structuredClone(initial) as RegionsFile);
  const [selected, setSelected] = useState<ShapeKey>(KEYS[0]!);
  const [polygon, setPolygon] = useState(0);
  const [status, setStatus] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ key: ShapeKey; polygon: number; point: number } | null>(null);

  const polygons = (key: ShapeKey): Polygon[] => (key.kind === "regions" ? data.regions[key.id] : data.masks[key.id]);
  const update = (key: ShapeKey, next: Polygon[]) =>
    setData((d) =>
      key.kind === "regions" ? { ...d, regions: { ...d.regions, [key.id]: next } } : { ...d, masks: { ...d.masks, [key.id]: next } },
    );

  const toFigure = (event: React.PointerEvent): [number, number] => {
    const point = svg.current!.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const p = point.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return [Number((p.x / VB_W).toFixed(4)), Number((p.y / VB_H).toFixed(4))];
  };

  const current = polygons(selected);
  const json = useMemo(() => JSON.stringify(data, null, 2), [data]);

  const onCanvasDown = (event: React.PointerEvent) => {
    if (event.target !== event.currentTarget && !(event.target as Element).closest(".editor-figure")) return;
    const next = current.map((p) => [...p]) as Polygon[];
    if (!next[polygon]) next[polygon] = [] as unknown as Polygon;
    next[polygon] = [...next[polygon]!, toFigure(event)] as Polygon;
    update(selected, next);
  };

  const save = async () => {
    const valid = Object.values(data.regions).every((list) => list.every((p) => p.length >= 3));
    if (!valid) return setStatus("Every polygon needs at least 3 points.");
    const response = await fetch("/__regions", { method: "POST", body: json });
    setStatus(response.ok ? "Saved to src/content/regions.json" : `Save failed: ${await response.text()}`);
  };

  return (
    <div className="region-editor">
      <svg
        ref={svg}
        viewBox={VIEWBOX}
        className="region-editor__canvas"
        onPointerDown={onCanvasDown}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d) return;
          const list = polygons(d.key).map((p) => [...p]) as Polygon[];
          list[d.polygon]![d.point] = toFigure(event);
          update(d.key, list);
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <g className="editor-figure" dangerouslySetInnerHTML={{ __html: FIGURE_MARKUP }} />
        <rect x={FRAME.left} y={FRAME.top} width={FRAME.right - FRAME.left} height={FRAME.bottom - FRAME.top} className="vitruvian-line" />
        <circle cx={VITRUVIAN.circle.cx} cy={VITRUVIAN.circle.cy} r={VITRUVIAN.circle.r} className="vitruvian-line" />
        {KEYS.map((key) =>
          polygons(key).map((poly, pi) => {
            const active = same(key, selected);
            return (
              <g key={`${label(key)}-${pi}`} className={active ? "editor-poly editor-poly--active" : "editor-poly"}>
                <polygon
                  points={poly.map(([x, y]) => `${x * VB_W},${y * VB_H}`).join(" ")}
                  onPointerDown={(event) => {
                    if (active) return;
                    event.stopPropagation();
                    setSelected(key);
                    setPolygon(pi);
                  }}
                />
                {active &&
                  poly.map(([x, y], i) => (
                    <circle
                      key={i}
                      cx={x * VB_W}
                      cy={y * VB_H}
                      r={6}
                      className={pi === polygon ? "editor-point editor-point--current" : "editor-point"}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setPolygon(pi);
                        if (event.shiftKey) {
                          const list = polygons(key).map((p) => [...p]) as Polygon[];
                          list[pi] = list[pi]!.filter((_, j) => j !== i) as Polygon;
                          update(key, list);
                          return;
                        }
                        (event.target as Element).setPointerCapture?.(event.pointerId);
                        drag.current = { key, polygon: pi, point: i };
                      }}
                    />
                  ))}
              </g>
            );
          }),
        )}
      </svg>

      <aside className="region-editor__panel">
        <h1 className="font-display text-3xl">Region editor</h1>
        <p className="text-sm">Click to add points · drag to move · shift-click a point to delete</p>
        <ul className="region-editor__list">
          {KEYS.map((key) => (
            <li key={label(key)}>
              <button
                type="button"
                aria-pressed={same(key, selected)}
                onClick={() => {
                  setSelected(key);
                  setPolygon(0);
                }}
              >
                {label(key)} <span className="opacity-60">({polygons(key).length})</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <span className="hud-label self-center">Polygon</span>
          {current.map((_, i) => (
            <button key={i} type="button" aria-pressed={i === polygon} onClick={() => setPolygon(i)}>
              {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => setPolygon(current.length)}>
            + new
          </button>
          <button
            type="button"
            disabled={!current[polygon]}
            onClick={() => {
              update(selected, current.filter((_, i) => i !== polygon));
              setPolygon(0);
            }}
          >
            delete
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={save}>
            Save
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(json).then(() => setStatus("Copied JSON"), () => setStatus("Copy failed"))}
          >
            Copy JSON
          </button>
          <button type="button" onClick={() => setData(structuredClone(initial) as RegionsFile)}>
            Reset
          </button>
        </div>
        <p role="status" className="min-h-6 text-sm">
          {status}
        </p>
        <textarea readOnly value={json} className="region-editor__json" aria-label="regions.json" />
      </aside>
    </div>
  );
}
