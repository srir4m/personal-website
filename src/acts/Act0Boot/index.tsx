import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { content } from "../../content";
import { text } from "../../content/text";
import { DURATION, EASE } from "../../stage/motion";
import { useStage } from "../../stage/store";
import { graticulePaths } from "../Act1Globe/ortho";
import { IDLE_START_LNG, IDLE_TILT_DEG } from "../Act1Globe/layout";
import type { ActProps } from "../registry";

gsap.registerPlugin(DrawSVGPlugin);


export default function Act0Boot(_: ActProps) {
  const name = text(content.owner.name);
  const tagline = text(content.owner.tagline);
  // What the owner does, in one line of existing facts: degree · school · area.
  const role = [text(content.education.degree), text(content.education.school), content.owner.area && text(content.owner.area.label)].filter(
    (fact): fact is string => Boolean(fact),
  );
  const ready = useStage((s) => s.bootReady);
  const calm = useStage((s) => s.motion === "calm");
  const drawing = useRef<SVGSVGElement>(null);
  const paths = useMemo(() => graticulePaths(IDLE_TILT_DEG, IDLE_START_LNG), []);
  // The HTML already painted the title and started its ink-in (see siteMeta in vite.config).
  // Pick the ink-in up where it is, then drop the HTML copy, so the hand-over is invisible.
  const [inkDelay] = useState(() => {
    const served = document.getElementById("boot-title");
    const start = Number(served?.dataset.start);
    return Number.isFinite(start) ? `${-(performance.now() - start) / 1000}s` : undefined;
  });
  useLayoutEffect(() => document.getElementById("boot-title")?.remove(), []);

  // Time-based, not scrubbed: the codex page inks itself in on load (PRD Act 0). The
  // graticule draws in one stroke with the title's ink-in, on the same curve and time.
  useLayoutEffect(() => {
    if (calm || !drawing.current) return;
    const ctx = gsap.context(() => {
      gsap.from([".boot-rim", ".boot-line"], { drawSVG: 0, duration: DURATION.slow, ease: EASE });
    }, drawing);
    return () => ctx.revert();
  }, [calm]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-parchment text-ink">
      <svg ref={drawing} viewBox="-1.02 -1.02 2.04 2.04" className="globe-circle absolute opacity-40" aria-hidden="true">
        <circle className="boot-rim fill-none stroke-sepia" r="1" strokeWidth="0.004" />
        {paths.map((d, i) => (
          <path key={i} d={d} className="boot-line fill-none stroke-sepia" strokeWidth="0.0025" />
        ))}
      </svg>

      {(name || tagline) && (
        <div
          className={`relative flex flex-col items-center gap-3 px-6 text-center ${calm ? "" : "ink-reveal"}`}
          style={inkDelay ? { animationDelay: inkDelay } : undefined}
        >
          {name && <p className="font-pixel text-6xl leading-none font-bold md:text-8xl">{name}</p>}
          {tagline && <p className="font-display text-2xl italic md:text-3xl">{tagline}</p>}
          {role.length > 0 && (
            // Each fact wraps as a whole, its separator kept with it, so no line starts with one.
            <p className="boot-role">
              {role.map((fact, i) => (
                <span key={fact}>
                  <span className="whitespace-nowrap">{i < role.length - 1 ? `${fact} ·` : fact}</span>
                  {i < role.length - 1 && " "}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <div className="scroll-cue" data-shown={ready} aria-hidden={!ready}>
        <svg viewBox="0 0 24 40" className="h-10 w-6" aria-hidden="true">
          <path d="M12 2V34M5 27L12 36L19 27" className="fill-none stroke-ink" strokeWidth="1.25" />
          <path d="M9 8H15M9 12H15M9 16H15" className="stroke-sepia" strokeWidth="0.75" />
        </svg>
        <span className="font-label text-xs tracking-[0.1em] uppercase">scroll</span>
      </div>
      {!ready && (
        <p className="hud-label absolute bottom-6 left-1/2 -translate-x-1/2 text-sepia" role="status">
          Loading
        </p>
      )}
    </div>
  );
}
