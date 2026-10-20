import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { registerActTimeline } from "../../stage/timeline";
import { FIGURE_MARKUP, FRAME, VIEWBOX, VITRUVIAN } from "../../vitruvian/figure";
import { graticulePaths } from "../Act1Globe/ortho";
import { IDLE_START_LNG, IDLE_TILT_DEG } from "../Act1Globe/layout";
import type { ActProps } from "../registry";

gsap.registerPlugin(DrawSVGPlugin);

const { circle } = VITRUVIAN;
/** The globe ghost starts this many times larger than the Vitruvian circle: past the viewport. */
const GHOST_START_SCALE = 3.2;

/**
 * A noise-thresholded alpha mask (PRD Act 4 "ink-wash"). Animating the transfer
 * function's intercept from `hidden` to `visible` inks the masked content in, in
 * ink-like blotches.
 */
type Box = { x: number; y: number; width: number; height: number };

function InkMask({ id, seed, frequency = 0.012, box }: { id: string; seed: number; frequency?: number; box: Box }) {
  // The filter and mask cover only `box`: turbulence costs per pixel, every frame it animates.
  return (
    <>
      <filter id={`${id}-noise`} filterUnits="userSpaceOnUse" {...box} colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={2} seed={seed} />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" />
        <feComponentTransfer>
          <feFuncA className={`${id}-threshold`} type="linear" slope="7" intercept="1" />
        </feComponentTransfer>
      </filter>
      <mask id={id} maskUnits="userSpaceOnUse" {...box}>
        <rect {...box} fill="white" filter={`url(#${id}-noise)`} />
      </mask>
    </>
  );
}

const VISIBLE = 1;
const HIDDEN = -6;

const [, , VB_W, VB_H] = VITRUVIAN.viewBox;
const FIGURE_BOX = { x: 0, y: 0, width: VB_W, height: VB_H };

export default function Act4Becoming({ index }: ActProps) {
  const scope = useRef<SVGSVGElement>(null);
  const graticule = useMemo(() => graticulePaths(IDLE_TILT_DEG, IDLE_START_LNG), []);
  const squarePath = `M${FRAME.left},${FRAME.top}H${FRAME.right}V${FRAME.bottom}H${FRAME.left}Z`;

  // Three beats, one after another: the figure inks in, the square draws itself, and the
  // globe from the start comes back as a ghost and settles onto the Vitruvian circle.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      tl.set({}, {}, 1);
      // The ink mask is attached only while the figure inks in; a masked 360 KB figure is
      // expensive to repaint. Timeline sets revert when scrubbing back.
      gsap.set(".becoming-figure", { attr: { mask: "url(#bleed-in)" } });
      // Eased out, so ink starts to show as soon as the act has faded in.
      tl.fromTo(
        ".bleed-in-threshold",
        { attr: { intercept: HIDDEN } },
        { attr: { intercept: VISIBLE }, duration: 0.3, ease: "power2.out" },
        0.02,
      );
      tl.set(".becoming-figure", { attr: { mask: "none" } }, 0.32);
      tl.fromTo(".becoming-square", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.2 }, 0.26);
      tl.fromTo(".becoming-ghost", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.4);
      tl.fromTo(
        ".becoming-ghost-scale",
        { scale: GHOST_START_SCALE, svgOrigin: `${circle.cx} ${circle.cy}` },
        { scale: 1, duration: 0.36, ease: "power1.inOut" },
        0.42,
      );
      tl.fromTo(".becoming-graticule", { autoAlpha: 0.7 }, { autoAlpha: 0, duration: 0.1 }, 0.8);
      registerActTimeline(index, tl);
    }, scope);
    return () => ctx.revert();
  }, [index]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-parchment text-ink">
      <svg ref={scope} viewBox={VIEWBOX} className="vitruvian-stage" aria-hidden="true">
        <defs>
          <InkMask id="bleed-in" seed={27} frequency={0.016} box={FIGURE_BOX} />
        </defs>

        <g className="becoming-figure" dangerouslySetInnerHTML={{ __html: FIGURE_MARKUP }} />

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
        Leonardo's Vitruvian figure inks itself onto the page, framed by a square, while the globe from the start
        shrinks into the circle around it.
      </p>
    </div>
  );
}
