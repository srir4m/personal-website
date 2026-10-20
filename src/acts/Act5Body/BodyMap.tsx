import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { CodexPanel } from "../../components/CodexPanel";
import { CourseLog } from "../../components/CourseLog";
import type { PoseMode } from "../../content/text";
import { useStage } from "../../stage/store";
import { FIGURE_MARKUP, FRAME, VIEWBOX, VITRUVIAN } from "../../vitruvian/figure";
import { RegionItems } from "./RegionItems";
import { BODY_REGIONS, isDormant, pointsAttr, POSE_MASKS, regionItems, type BodyRegion } from "./regions";

// The vault ships in its own chunk, with marked and DOMPurify, loaded only when opened.
const Vault = lazy(async () => {
  const [{ VaultPanel }, { default: vault }] = await Promise.all([import("../../vault/VaultPanel"), import("virtual:vault")]);
  return { default: () => <VaultPanel vault={vault} /> };
});

const [, , VB_W, VB_H] = VITRUVIAN.viewBox;
const { circle } = VITRUVIAN;

/** Where a region's HUD label sits: beside the figure, on the side of the region's centroid. */
function labelAnchor(region: BodyRegion): { x: number; y: number; side: "left" | "right" } {
  const side = region.centroid[0] < VB_W / 2 ? "left" : "right";
  return { x: side === "left" ? -VB_W * 0.04 : VB_W * 1.04, y: region.centroid[1], side };
}

/**
 * The body map (PRD Act 5): Leonardo's figure with clickable regions, a Now / Reaching
 * pose toggle, and the heart vault. Hover or focus hatches a region in red chalk and
 * leads a HUD label to it; click, Enter or Space opens its codex panel.
 */
export function BodyMap() {
  const mode = useStage((s) => s.poseMode);
  const setMode = useStage((s) => s.setPoseMode);
  const openPanel = useStage((s) => s.openPanel);
  const setOpenPanel = useStage((s) => s.setOpenPanel);
  const [active, setActive] = useState<string | null>(null);
  const regionEls = useRef<Record<string, SVGGElement | null>>({});
  const returnFocus = useRef<SVGGElement | null>(null);
  const ids = { hatch: useId(), pose: useId(), veil: useId() };

  const open = BODY_REGIONS.find((r) => r.id === openPanel && !isDormant(r, mode)) ?? null;
  useEffect(() => {
    if (open) returnFocus.current = regionEls.current[open.id] ?? null;
  }, [open]);

  const activeRegion = BODY_REGIONS.find((r) => r.id === active) ?? null;
  const anchor = activeRegion ? labelAnchor(activeRegion) : null;
  const items = useMemo(() => (open ? regionItems(open, mode) : []), [open, mode]);
  const framePath = `M${FRAME.left},${FRAME.top}H${FRAME.right}V${FRAME.bottom}H${FRAME.left}Z`;
  const url = (id: string) => `url(#${CSS.escape(id)})`;

  return (
    <div className="body-map">
      <div className="body-frame" style={{ aspectRatio: `${VB_W} / ${VB_H}` }} data-active-region={active ?? undefined}>
        <svg viewBox={VIEWBOX} className="body-figure" data-pose={mode}>
          <defs>
            <pattern id={ids.hatch} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
              <line x1="0" y1="0" x2="0" y2="16" className="region-hatch-line" />
              <line x1="8" y1="0" x2="8" y2="16" className="region-hatch-line region-hatch-line--faint" />
            </pattern>
            {/* Inactive-pose limbs drop to 15% (black at 0.85 over white); the active pose stays whole. */}
            <mask id={ids.pose} maskUnits="userSpaceOnUse" x={-VB_W} y={-VB_H} width={VB_W * 3} height={VB_H * 3}>
              <rect x={-VB_W} y={-VB_H} width={VB_W * 3} height={VB_H * 3} fill="white" />
              {(["now", "reaching"] as PoseMode[]).map((pose) => (
                <g key={`dim-${pose}`} className="pose-mask" style={{ opacity: mode === pose ? 0 : 0.85 }} fill="black">
                  {POSE_MASKS[pose].map((poly, i) => (
                    <polygon key={i} points={pointsAttr(poly)} />
                  ))}
                </g>
              ))}
              {(["now", "reaching"] as PoseMode[]).map((pose) => (
                <g key={`keep-${pose}`} className="pose-mask" style={{ opacity: mode === pose ? 1 : 0 }} fill="white">
                  {POSE_MASKS[pose].map((poly, i) => (
                    <polygon key={i} points={pointsAttr(poly)} />
                  ))}
                </g>
              ))}
            </mask>
            {activeRegion && (
              <mask id={ids.veil} maskUnits="userSpaceOnUse" x={-VB_W} y={-VB_H} width={VB_W * 3} height={VB_H * 3}>
                <rect x={-VB_W} y={-VB_H} width={VB_W * 3} height={VB_H * 3} fill="white" />
                {activeRegion.polygons.map((poly, i) => (
                  <polygon key={i} points={pointsAttr(poly)} fill="black" />
                ))}
              </mask>
            )}
          </defs>

          <path d={framePath} className="vitruvian-line" />
          <circle cx={circle.cx} cy={circle.cy} r={circle.r} className="vitruvian-line" />
          <g mask={url(ids.pose)} dangerouslySetInnerHTML={{ __html: FIGURE_MARKUP }} />
          {/* Every other region dims slightly while one is active. */}
          {activeRegion && (
            <rect x={-VB_W} y={-VB_H} width={VB_W * 3} height={VB_H * 3} className="region-veil" mask={url(ids.veil)} />
          )}

          {BODY_REGIONS.map((region) => {
            const dormant = isDormant(region, mode);
            const name = `${region.label}: ${region.theme}`;
            const activate = () => {
              returnFocus.current = regionEls.current[region.id] ?? null;
              setOpenPanel(region.id);
            };
            return (
              <g
                key={region.id}
                ref={(el) => {
                  regionEls.current[region.id] = el;
                }}
                className="region"
                data-region={region.id}
                data-dormant={dormant || undefined}
                role={dormant ? undefined : "button"}
                tabIndex={dormant ? undefined : 0}
                aria-label={dormant ? undefined : name}
                aria-haspopup={dormant ? undefined : "dialog"}
                aria-hidden={dormant || undefined}
                onPointerEnter={() => !dormant && setActive(region.id)}
                onPointerLeave={() => setActive((a) => (a === region.id ? null : a))}
                onFocus={() => setActive(region.id)}
                onBlur={() => setActive((a) => (a === region.id ? null : a))}
                onClick={() => !dormant && activate()}
                onKeyDown={(event) => {
                  if (dormant || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  activate();
                }}
              >
                {region.polygons.map((poly, i) => (
                  <polygon
                    key={i}
                    points={pointsAttr(poly)}
                    className="region-shape"
                    style={active === region.id ? { fill: url(ids.hatch) } : undefined}
                  />
                ))}
              </g>
            );
          })}

          {/* The heart sits inside the chest, which comes later in tab order and so paints over
              it. A pointer-only copy on top keeps the heart clickable; keyboard users reach the
              real one in order. */}
          {BODY_REGIONS.filter((r) => r.id === "heart").map((region) => (
            <g
              key="heart-hit"
              className="region region--hit"
              aria-hidden="true"
              onPointerEnter={() => setActive(region.id)}
              onPointerLeave={() => setActive((a) => (a === region.id ? null : a))}
              onClick={() => {
                returnFocus.current = regionEls.current[region.id] ?? null;
                setOpenPanel(region.id);
              }}
            >
              {region.polygons.map((poly, i) => (
                <polygon key={i} points={pointsAttr(poly)} className="region-shape" />
              ))}
            </g>
          ))}

          {activeRegion && anchor && (
            <g className="region-leader" aria-hidden="true">
              <path d={`M${activeRegion.centroid[0]},${activeRegion.centroid[1]}L${anchor.x},${anchor.y}`} />
              <rect x={activeRegion.centroid[0] - 5} y={activeRegion.centroid[1] - 5} width="10" height="10" />
            </g>
          )}
        </svg>

        {activeRegion && anchor && (
          <div
            className="region-label hud-panel"
            data-side={anchor.side}
            style={{ left: `${(anchor.x / VB_W) * 100}%`, top: `${(anchor.y / VB_H) * 100}%` }}
            aria-hidden="true"
          >
            <p className="font-display text-2xl leading-none">{activeRegion.label}</p>
            <p className="hud-label mt-1">{activeRegion.theme}</p>
          </div>
        )}
      </div>

      <p className="body-hint">Select a part of the figure to read more.</p>

      <PoseToggle mode={mode} onChange={setMode} />

      <CodexPanel
        open={open !== null}
        onClose={() => setOpenPanel(null)}
        label={open?.label ?? ""}
        theme={open?.theme ?? ""}
        returnFocus={returnFocus}
      >
        {open?.id === "heart" ? (
          <Suspense fallback={<p className="hud-label">Unsealing…</p>}>
            <Vault />
          </Suspense>
        ) : (
          <>
            <RegionItems items={items} />
            {open?.id === "spine" && <CourseLog />}
          </>
        )}
      </CodexPanel>
    </div>
  );
}

/** The codex-styled two-position switch below the figure (PRD Act 5). */
function PoseToggle({ mode, onChange }: { mode: PoseMode; onChange: (mode: PoseMode) => void }) {
  const name = useId();
  return (
    <fieldset className="pose-toggle" data-mode={mode}>
      <legend className="sr-only">Pose</legend>
      {(["now", "reaching"] as PoseMode[]).map((pose) => (
        <label key={pose} className="pose-toggle__option">
          <input type="radio" name={name} value={pose} checked={mode === pose} onChange={() => onChange(pose)} />
          <span>{pose === "now" ? "Now" : "Reaching"}</span>
        </label>
      ))}
      <span className="pose-toggle__thumb" aria-hidden="true" />
    </fieldset>
  );
}
