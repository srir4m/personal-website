import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { contactLinks } from "../../content/contacts";
import { DURATION, EASE } from "../../stage/motion";
import { useStage } from "../../stage/store";
import { scrollToAct } from "../../stage/timeline";
import { FIGURE_MARKUP, FRAME, VIEWBOX, VITRUVIAN } from "../../vitruvian/figure";
import { graticulePaths } from "../Act1Globe/ortho";
import { IDLE_START_LNG, IDLE_TILT_DEG } from "../Act1Globe/layout";
import type { ActProps } from "../registry";

gsap.registerPlugin(DrawSVGPlugin);

const { circle } = VITRUVIAN;
const [, , VB_W, VB_H] = VITRUVIAN.viewBox;
/** The globe's resting size at the end, relative to the Vitruvian circle. */
const REST_SCALE = 0.42;

/**
 * Act 6 (PRD): a fast pull-back, played in time rather than scrubbed when the act
 * enters. The figure washes out, the square undraws, the circle grows its graticule back
 * and shrinks into a small globe at the centre. Then the contact links and Back to top.
 */
export default function Act6Outro({ index }: ActProps) {
  const scope = useRef<SVGSVGElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const active = useStage((s) => s.activeAct === index);
  const calm = useStage((s) => s.motion === "calm");
  const graticule = useMemo(() => graticulePaths(IDLE_TILT_DEG, IDLE_START_LNG), []);
  const contacts = contactLinks();
  const framePath = `M${FRAME.left},${FRAME.top}H${FRAME.right}V${FRAME.bottom}H${FRAME.left}Z`;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const { base, slow } = DURATION;
      const tl = gsap.timeline({ paused: true, defaults: { ease: EASE } });
      // The figure washes out and the square undraws together…
      tl.fromTo(".outro-wash", { attr: { intercept: 1 } }, { attr: { intercept: -6 }, duration: base * 2 }, 0);
      tl.fromTo(".outro-square", { drawSVG: "0% 100%" }, { drawSVG: "0% 0%", duration: base * 2 }, 0);
      // …then the circle becomes a globe again and pulls back to rest…
      tl.fromTo([".outro-sphere", ".outro-graticule"], { autoAlpha: 0 }, { autoAlpha: 1, duration: base }, base);
      tl.fromTo(
        ".outro-globe",
        { scale: 1, x: 0, y: 0, svgOrigin: `${circle.cx} ${circle.cy}` },
        { scale: REST_SCALE, x: VB_W / 2 - circle.cx, y: VB_H * 0.42 - circle.cy, duration: slow },
        base,
      );
      // …and the links arrive once it has settled.
      tl.fromTo(links.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: base }, base + slow);
      timeline.current = tl;
    }, scope);
    return () => ctx.revert();
  }, []);

  // Plays each time the act is entered; Calm mode shows the settled frame (PRD §10.1).
  useLayoutEffect(() => {
    const tl = timeline.current;
    if (!tl) return;
    if (!active) tl.pause(0);
    else if (calm) tl.progress(1).pause();
    else tl.play(0);
  }, [active, calm]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-parchment text-ink">
      <svg ref={scope} viewBox={VIEWBOX} className="vitruvian-stage" aria-hidden="true">
        <defs>
          <filter id="outro-noise" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency={0.016} numOctaves={3} seed={41} />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" />
            <feComponentTransfer>
              <feFuncA className="outro-wash" type="linear" slope="7" intercept="1" />
            </feComponentTransfer>
          </filter>
          <mask id="outro-mask" maskUnits="userSpaceOnUse" x={-VB_W} y={-VB_H} width={VB_W * 3} height={VB_H * 3}>
            <rect x={-VB_W} y={-VB_H} width={VB_W * 3} height={VB_H * 3} fill="white" filter="url(#outro-noise)" />
          </mask>
        </defs>
        <g mask="url(#outro-mask)" dangerouslySetInnerHTML={{ __html: FIGURE_MARKUP }} />
        <path d={framePath} className="vitruvian-line outro-square" />
        <g className="outro-globe">
          <g transform={`translate(${circle.cx} ${circle.cy}) scale(${circle.r})`}>
            <circle r="1" className="outro-sphere" />
            <g className="outro-graticule">
              {graticule.map((d, i) => (
                <path key={i} d={d} className="vitruvian-graticule" />
              ))}
            </g>
            <circle r="1" className="vitruvian-line" />
          </g>
        </g>
      </svg>

      <div ref={links} className="outro-links">
        {contacts.length > 0 && (
          <p className="section-title" aria-hidden="true">
            Contact
          </p>
        )}
        {contacts.length > 0 && (
          <ul className="outro-list">
            {contacts.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noopener" className="outro-link">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="outro-top"
          onClick={() => {
            useStage.setState({ openPanel: null });
            scrollToAct(0);
          }}
        >
          Back to top ↑
        </button>
      </div>
    </div>
  );
}
