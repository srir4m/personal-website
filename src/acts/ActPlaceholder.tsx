import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ACTS } from "../stage/acts";
import { registerActTimeline } from "../stage/timeline";

type Props = {
  index: number;
  /** Tailwind classes for the block's background and text colour. */
  tone: string;
  summary: string;
  children?: ReactNode;
};

/**
 * M0 stand-in for an act: a labelled colour block whose rule draws across as the act
 * scrolls, which proves the act's sub-timeline is scrubbed by the master timeline.
 */
export function ActPlaceholder({ index, tone, summary, children }: Props) {
  const ruleRef = useRef<HTMLDivElement>(null);
  const act = ACTS[index]!;

  useLayoutEffect(() => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    tl.fromTo(ruleRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1 });
    return registerActTimeline(index, tl);
  }, [index]);

  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center ${tone}`}>
      <p className="font-mono text-sm tracking-[0.3em] uppercase opacity-80">
        Act {index} · placeholder
      </p>
      <p aria-hidden="true" className="font-display text-6xl leading-none md:text-8xl">
        {act.name}
      </p>
      <p className="max-w-xl font-display text-xl">{summary}</p>
      <div className="h-px w-64 max-w-full bg-current opacity-30">
        <div ref={ruleRef} className="h-px w-full origin-left bg-current" />
      </div>
      {children}
    </div>
  );
}
