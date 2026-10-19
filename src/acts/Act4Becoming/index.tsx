import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { content } from "../../content";
import { registerActTimeline } from "../../stage/timeline";
import { FIGURE_MARKUP, FRAME, VIEWBOX, VITRUVIAN } from "../../vitruvian/figure";
import { graticulePaths } from "../Act1Globe/ortho";
import { IDLE_START_LNG, IDLE_TILT_DEG } from "../Act1Globe/layout";
import type { ActProps } from "../registry";
import { SILHOUETTE_PATH } from "./silhouette";

gsap.registerPlugin(DrawSVGPlugin);

const { circle, square } = VITRUVIAN;
/** The globe ghost starts this many times larger than the Vitruvian circle: past the viewport. */
const GHOST_START_SCALE = 3.2;
/**
 * The other squad silhouettes (`squad.silhouetteCount` includes the centre one), placed
 * alternately left and right, smaller as they step back. Offsets are in square units.
 */
const SQUAD = Array.from({ length: Math.max(0, content.squad.silhouetteCount - 1) }, (_, i) => {
  const rank = Math.floor(i / 2) + 1;
  return { dx: (i % 2 ? 1 : -1) * 0.31 * rank, scale: 1 - 0.07 * rank };
});

/**
 * A noise-thresholded alpha mask (PRD Act 4 "ink-wash"). Animating the transfer
 * function's intercept from `visible` to `hidden` dissolves the masked content in ink-like
 * blotches; the reverse inks it in.
 */
function InkMask({ id, seed, frequency = 0.012 }: { id: string; seed: number; frequency?: number }) {
  return (
    <>
      <filter id={`${id}-noise`} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={3} seed={seed} />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" />
        <feComponentTransfer>
          <feFuncA className={`${id}-threshold`} type="linear" slope="7" intercept="1" />
        </feComponentTransfer>
      </filter>
      <mask id={id} maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000">
        <rect x="-2000" y="-2000" width="5000" height="5000" fill="white" filter={`url(#${id}-noise)`} />
      </mask>
    </>
  );
}

const VISIBLE = 1;
const HIDDEN = -6;

export default function Act4Becoming({ index }: ActProps) {
  const scope = useRef<SVGSVGElement>(null);
  const graticule = useMemo(() => graticulePaths(IDLE_TILT_DEG, IDLE_START_LNG), []);
  const centre = { x: square.x + square.size / 2, y: square.y + square.size / 2 };
  const silhouetteTransform = (dx: number, scale: number) =>
    `translate(${square.x + (dx + (1 - scale) / 2) * square.size} ${square.y + (1 - scale) * square.size}) scale(${square.size * scale})`;
  const squarePath = `M${FRAME.left},${FRAME.top}H${FRAME.right}V${FRAME.bottom}H${FRAME.left}Z`;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      tl.set({}, {}, 1);
      // Camera pushes toward the centre silhouette while the others wash away.
      tl.fromTo(".becoming-squad", { scale: 0.62, svgOrigin: `${centre.x} ${centre.y + square.size * 0.1}` }, { scale: 1, duration: 0.28 }, 0);
      tl.fromTo(".wash-others-threshold", { attr: { intercept: VISIBLE } }, { attr: { intercept: HIDDEN }, duration: 0.24 }, 0.04);
      // The silhouette bleeds out as the figure bleeds in (no path morph: PRD Act 4).
      tl.fromTo(".bleed-out-threshold", { attr: { intercept: VISIBLE } }, { attr: { intercept: HIDDEN }, duration: 0.22 }, 0.28);
      tl.fromTo(".bleed-in-threshold", { attr: { intercept: HIDDEN } }, { attr: { intercept: VISIBLE }, duration: 0.24 }, 0.26);
      // The square draws itself, corner to corner.
      tl.fromTo(".becoming-square", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.2 }, 0.46);
      // The globe returns as a ghost, shrinks onto the Vitruvian circle, and sheds its graticule.
      tl.fromTo(".becoming-ghost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.54);
      tl.fromTo(
        ".becoming-ghost-scale",
        { scale: GHOST_START_SCALE, svgOrigin: `${circle.cx} ${circle.cy}` },
        { scale: 1, duration: 0.3, ease: "power1.inOut" },
        0.56,
      );
      tl.fromTo(".becoming-graticule", { autoAlpha: 0.7 }, { autoAlpha: 0, duration: 0.1 }, 0.82);
      registerActTimeline(index, tl);
    }, scope);
    return () => ctx.revert();
  }, [index, centre.x, centre.y]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-parchment text-ink">
      <svg ref={scope} viewBox={VIEWBOX} className="vitruvian-stage" aria-hidden="true">
        <defs>
          <InkMask id="wash-others" seed={4} frequency={0.01} />
          <InkMask id="bleed-out" seed={11} frequency={0.016} />
          <InkMask id="bleed-in" seed={27} frequency={0.016} />
        </defs>

        <g className="becoming-squad">
          <g mask="url(#wash-others)">
            {SQUAD.map(({ dx, scale }) => (
              <path key={dx} d={SILHOUETTE_PATH} transform={silhouetteTransform(dx, scale)} className="becoming-silhouette" />
            ))}
          </g>
          <g mask="url(#bleed-out)">
            <path d={SILHOUETTE_PATH} transform={silhouetteTransform(0, 1)} className="becoming-silhouette" />
          </g>
        </g>

        <g mask="url(#bleed-in)" dangerouslySetInnerHTML={{ __html: FIGURE_MARKUP }} />

        <path d={squarePath} className="vitruvian-line becoming-square" />

        <g className="becoming-ghost">
          <g className="becoming-ghost-scale">
            <g transform={`translate(${circle.cx} ${circle.cy}) scale(${circle.r})`}>
              <g className="becoming-graticule">
                {graticule.map((d, i) => (
                  <path key={i} d={d} className="vitruvian-graticule" />
                ))}
              </g>
              <circle r="1" className="vitruvian-line" data-testid="vitruvian-circle" />
            </g>
          </g>
        </g>
      </svg>
      <p className="sr-only">
        One figure steps forward from the group and becomes Leonardo's Vitruvian figure, framed by a square, while the
        globe from the start shrinks into the circle around it.
      </p>
    </div>
  );
}
