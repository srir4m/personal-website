import { useEffect, useRef } from "react";
import { ACTS, ACT_RANGES, actAt, type ActId } from "../stage/acts";
import { actProgress, useStage } from "../stage/store";
import { scrollToAct } from "../stage/timeline";
import { CHAPTERS, chapterAt, READING_LINE, type ChapterKind } from "../stage/chapters";
import { scrollToChapter } from "../stage/chapterScroll";

/**
 * What the rail calls each act. Acts that are passages between two places (the map
 * descent, Becoming) keep a tick but no label, so the rail reads as a short contents list.
 */
const RAIL_LABELS: Partial<Record<ActId, string>> = {
  boot: "Home",
  globe: "Location",
  tour: "Profile",
  body: "Explore",
  outro: "Contact",
};

/**
 * The codex margin (PRD §3.1): a vertical rail on the left on desktop, a thin top bar on
 * phones. One tick per act; clicking a tick scrolls to that act.
 */
export function ProgressRail() {
  const activeAct = useStage((s) => s.activeAct);
  const fillRef = useRef<HTMLDivElement>(null);

  // Progress changes every frame, so write it straight to the DOM instead of re-rendering.
  // `--step` is the same progress with every act given an equal share: the phone bar spaces
  // its ticks evenly, so each one is a full-size tap target.
  useEffect(
    () =>
      useStage.subscribe((s) => {
        const act = actAt(s.progress);
        const step = (act + actProgress(ACT_RANGES[act]!, s.progress)) / ACTS.length;
        fillRef.current?.style.setProperty("--progress", String(s.progress));
        fillRef.current?.style.setProperty("--step", String(step));
      }),
    [],
  );

  return (
    <nav aria-label="Acts" className="progress-rail fixed z-30">
      <div className="rail-track" aria-hidden="true">
        <div ref={fillRef} className="rail-fill" />
      </div>
      <ol className="rail-ticks">
        {ACTS.map((act, i) => {
          const label = RAIL_LABELS[act.id];
          return (
            <li
              key={act.id}
              className="rail-tick"
              style={{ "--at": ACT_RANGES[i]!.start, "--i": i, "--n": ACTS.length } as React.CSSProperties}
            >
              <a
                href={act.hash ? `#${act.hash}` : "#"}
                aria-current={i === activeAct ? "step" : undefined}
                aria-label={label ? undefined : act.name}
                data-minor={label ? undefined : ""}
                onClick={(event) => {
                  event.preventDefault();
                  useStage.setState({ bootReady: true });
                  scrollToAct(i);
                }}
              >
                <span className="rail-mark" aria-hidden="true" />
                {label && <span className="rail-label">{label}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Chapters the rail names; the tour's stops between them get an unlabelled tick. */
const MAJOR_CHAPTERS = new Set<ChapterKind>(["hero", "location", "campus", "about", "body", "contact"]);

/**
 * The rail for the pixel layout's chapters (issue #8): a square per chapter at its place
 * in the page, a red fill up to the reading position, and the chapter's name and the
 * percentage read beside the fill's head. Clicking a square scrolls to its chapter.
 */
export function ChapterRail() {
  const activeChapter = useStage((s) => s.activeChapter);
  const railRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLParagraphElement>(null);
  const at = useRef<number[]>([]);

  useEffect(() => {
    // Each chapter's place on the rail: where its reading position falls in the page's scroll.
    const place = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      at.current = CHAPTERS.map((c) => {
        const section = document.getElementById(`chapter-${c.id}`);
        if (!section) return 0;
        const box = section.getBoundingClientRect();
        const top = box.top + window.scrollY + Math.min(box.height, window.innerHeight) / 2 - window.innerHeight * READING_LINE;
        return Math.min(1, Math.max(0, top / max));
      });
      railRef.current?.querySelectorAll<HTMLElement>(".rail-tick").forEach((tick, i) => tick.style.setProperty("--at", String(at.current[i] ?? 0)));
      draw(useStage.getState().chapterP);
    };
    const draw = (p: number) => {
      const i = Math.floor(p);
      const from = at.current[i] ?? 0;
      const progress = from + ((at.current[i + 1] ?? from) - from) * (p - i);
      const pct = Math.round(Math.min(1, Math.max(0, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))) * 100);
      fillRef.current?.style.setProperty("--progress", progress.toFixed(4));
      fillRef.current?.style.setProperty("--step", String(p / Math.max(1, CHAPTERS.length - 1)));
      if (headRef.current) {
        headRef.current.style.setProperty("--progress", progress.toFixed(4));
        headRef.current.textContent = `${CHAPTERS[chapterAt(p)]!.name} · ${pct}%`;
      }
    };
    const observer = new ResizeObserver(place);
    observer.observe(document.body);
    place();
    const unsubscribe = useStage.subscribe((s, prev) => s.chapterP !== prev.chapterP && draw(s.chapterP));
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, []);

  return (
    <nav ref={railRef} aria-label="Chapters" className="progress-rail fixed z-30">
      <div className="rail-track" aria-hidden="true">
        <div ref={fillRef} className="rail-fill" />
      </div>
      <p ref={headRef} className="rail-head" aria-hidden="true" />
      <ol className="rail-ticks">
        {CHAPTERS.map((chapter, i) => (
          <li key={chapter.id} className="rail-tick" style={{ "--at": 0, "--i": i, "--n": CHAPTERS.length } as React.CSSProperties}>
            <a
              href={chapter.hash ? `#${chapter.hash}` : "#"}
              aria-current={i === activeChapter ? "step" : undefined}
              aria-label={chapter.name}
              data-minor={MAJOR_CHAPTERS.has(chapter.kind) ? undefined : ""}
              onClick={(event) => {
                event.preventDefault();
                scrollToChapter(i);
              }}
            >
              <span className="rail-mark" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
