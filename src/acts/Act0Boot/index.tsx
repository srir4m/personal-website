import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { content } from "../../content";
import { text } from "../../content/text";
import { useStage } from "../../stage/store";
import { graticulePaths } from "../Act1Globe/ortho";
import { IDLE_START_LNG, IDLE_TILT_DEG } from "../Act1Globe/layout";
import type { ActProps } from "../registry";

gsap.registerPlugin(DrawSVGPlugin);

/** Seconds the opening ink-in takes; the boot gate waits at least this long. */
export const BOOT_INK_SECONDS = 1.4;

export default function Act0Boot(_: ActProps) {
  const name = text(content.owner.name);
  const tagline = text(content.owner.tagline);
  const ready = useStage((s) => s.bootReady);
  const calm = useStage((s) => s.motion === "calm");
  const drawing = useRef<SVGSVGElement>(null);
  const paths = useMemo(() => graticulePaths(IDLE_TILT_DEG, IDLE_START_LNG), []);

  // Time-based, not scrubbed: the codex page inks itself in on load (PRD Act 0).
  useLayoutEffect(() => {
    if (calm || !drawing.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".boot-rim", { drawSVG: 0, duration: BOOT_INK_SECONDS * 0.7, ease: "power2.out" });
      gsap.from(".boot-line", {
        drawSVG: 0,
        duration: BOOT_INK_SECONDS * 0.6,
        ease: "power2.out",
        stagger: { amount: BOOT_INK_SECONDS * 0.4, from: "random" },
      });
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
        <div className={`relative flex flex-col items-center gap-3 px-6 text-center ${calm ? "" : "ink-reveal"}`}>
          {name && <p className="font-display text-6xl leading-none font-semibold md:text-8xl">{name}</p>}
          {tagline && <p className="font-display text-2xl italic md:text-3xl">{tagline}</p>}
        </div>
      )}

      <div className="scroll-cue" data-shown={ready} aria-hidden={!ready}>
        <svg viewBox="0 0 24 40" className="h-10 w-6" aria-hidden="true">
          <path d="M12 2V34M5 27L12 36L19 27" className="fill-none stroke-ink" strokeWidth="1.25" />
          <path d="M9 8H15M9 12H15M9 16H15" className="stroke-sepia" strokeWidth="0.75" />
        </svg>
        <span className="font-mono text-xs tracking-[0.35em] uppercase">scroll</span>
      </div>
      {!ready && (
        <p className="hud-label absolute bottom-6 left-1/2 -translate-x-1/2 text-sepia" role="status">
          Loading
        </p>
      )}
    </div>
  );
}
