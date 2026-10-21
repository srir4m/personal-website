import { chapterAt, READING_LINE, readChapterP } from "./chapters";
import { useStage, writeChapterP } from "./store";

/**
 * The pixel layout's scroll (pixel move, issue #8): the page scrolls natively, and the
 * reading position in chapters is measured from the chapter sections on screen and
 * written to the store once per frame. Nothing is pinned or scrubbed; Calm mode snaps to
 * chapters with CSS scroll snapping (src/styles/chapters.css).
 */
let sections: HTMLElement[] = [];

/** Measures where the reader is and writes it to the store. */
function measure() {
  const boxes = sections.map((s) => s.getBoundingClientRect());
  const p = readChapterP(boxes, window.innerHeight);
  const state = useStage.getState();
  const active = chapterAt(p, sections.length);
  if (p !== state.chapterP || active !== state.activeChapter) writeChapterP(p, active);
}

/** Starts measuring the given chapter sections on scroll and resize. Returns a teardown. */
export function startChapterScroll(chapterSections: HTMLElement[]): () => void {
  sections = chapterSections;
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), measure()));
  };
  // Fonts and images change section heights after the first paint.
  const observer = new ResizeObserver(schedule);
  sections.forEach((s) => observer.observe(s));
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  measure();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    sections = [];
  };
}

/** The scroll position that puts a chapter where readChapterP counts it as exactly reached. */
function chapterTop(section: HTMLElement): number {
  const box = section.getBoundingClientRect();
  const mid = box.top + window.scrollY + Math.min(box.height, window.innerHeight) / 2;
  return Math.max(0, mid - window.innerHeight * READING_LINE);
}

/** Scrolls to a chapter. Calm mode and reduced motion always jump. */
export function scrollToChapter(index: number, { immediate = false } = {}) {
  const section = sections[index];
  if (!section) return;
  const instant = immediate || useStage.getState().motion === "calm";
  window.scrollTo({ top: chapterTop(section), behavior: instant ? "instant" : "smooth" });
}
