import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { EASE } from "../../stage/motion";
import { registerActTimeline } from "../../stage/timeline";
import { FIGURE_MARKUP, FRAME, VIEWBOX, VITRUVIAN } from "../../vitruvian/figure";
import { RING_OVERSIZE } from "../Descent/camera";
import type { ActProps } from "../registry";

gsap.registerPlugin(DrawSVGPlugin);

const { circle } = VITRUVIAN;

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
/** Just below the noise's first specks, so ink starts to show as soon as the wash begins. */
const HIDDEN = -4.5;

const [, , VB_W, VB_H] = VITRUVIAN.viewBox;
const FIGURE_BOX = { x: 0, y: 0, width: VB_W, height: VB_H };

export default function Act4Becoming({ index }: ActProps) {
  const scope = useRef<SVGSVGElement>(null);
  const squarePath = `M${FRAME.left},${FRAME.top}H${FRAME.right}V${FRAME.bottom}H${FRAME.left}Z`;

  // Three beats, one after another. The map's ring around the owner's area (left on screen
  // as the map dissolves) shrinks onto the Vitruvian circle and turns from red chalk to
  // ink: the world narrows to the person. Then the figure inks in and the square draws.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      tl.set({}, {}, 1);
      // From the map's ring (centred on screen, RING_OVERSIZE larger) onto the circle.
      tl.fromTo(
        ".becoming-ring",
        { scale: RING_OVERSIZE, x: VB_W / 2 - circle.cx, y: VB_H / 2 - circle.cy, svgOrigin: `${circle.cx} ${circle.cy}` },
        { scale: 1, x: 0, y: 0, duration: 0.3, ease: EASE },
        0,
      );
      tl.fromTo(".becoming-ring-chalk", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.18 }, 0.12);
      tl.fromTo(".becoming-ring-ink", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18 }, 0.1);
      // The ink mask is attached only while the figure inks in; a masked 360 KB figure is
      // expensive to repaint. Timeline sets revert when scrubbing back.
      gsap.set(".becoming-figure", { attr: { mask: "url(#bleed-in)" } });
      // Hidden while the ring lands, so no ink speck shows before the figure's own beat.
      gsap.set(".becoming-figure", { autoAlpha: 0 });
      tl.set(".becoming-figure", { autoAlpha: 1 }, 0.25);
      tl.fromTo(".bleed-in-threshold", { attr: { intercept: HIDDEN } }, { attr: { intercept: VISIBLE }, duration: 0.3, ease: EASE }, 0.25);
      tl.set(".becoming-figure", { attr: { mask: "none" } }, 0.56);
      tl.fromTo(".becoming-square", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.2 }, 0.45);
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

        <g className="becoming-ring">
          <g transform={`translate(${circle.cx} ${circle.cy}) scale(${circle.r})`}>
            <circle r="1" className="becoming-ring-chalk" />
            <circle r="1" className="vitruvian-line becoming-ring-ink" data-testid="vitruvian-circle" />
          </g>
        </g>
      </svg>
      <p className="sr-only">
        The ring around the owner's area on the map shrinks into the circle of Leonardo's Vitruvian figure, which
        inks itself onto the page, framed by a square.
      </p>
    </div>
  );
}
