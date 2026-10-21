import { content } from "../content";
import { text } from "../content/text";
import { buildTourStops, type TourStop } from "./tour";

/**
 * The chapters of the pixel layout (pixel move, issue #8, PR 2). The page is one column of
 * chapters over a fixed pixel scene, read top to bottom: a zoom from the world into the
 * person. Each chapter names the scene behind it, and the figure's region when it frames
 * one. Built only from site-content.json: a chapter with nothing to show is left out.
 *
 * The scene follows `chapterP` (the store): the reading position in chapter units, so 2.5
 * is halfway from the third chapter to the fourth. A change of scene between two adjacent
 * chapters is a transition, timed by the scene itself; nothing here hard-codes positions.
 */
export type SceneId = "globe" | "city" | "street" | "figure";
export type ChapterKind = "hero" | "location" | "campus" | "about" | "stop" | "body" | "contact";

export type Chapter = {
  /** Unique; the section's DOM id is `chapter-${id}`. */
  id: string;
  /** The URL hash that lands on it; "" for the first chapter. */
  hash: string;
  /** Older hashes (the act layout's) that land on it, so old links keep working. */
  aliases: string[];
  /** Its name on the rail and for screen readers. */
  name: string;
  kind: ChapterKind;
  scene: SceneId;
  /** The body region the figure frames, if any ("heart" for the vault). */
  region: TourStop["region"];
  /** A tour stop's content, for `stop` chapters. */
  stop?: TourStop;
};

// `import.meta.env` is Vite's; Node (e2e specs import this) has none, so count as production.
export function buildChapters(isProd = import.meta.env?.PROD ?? true): Chapter[] {
  const { owner, education } = content;
  const area = owner.area;
  const chapters: Chapter[] = [{ id: "home", hash: "", aliases: [], name: "Home", kind: "hero", scene: "globe", region: null }];
  if (area) chapters.push({ id: "location", hash: "location", aliases: ["globe"], name: "Location", kind: "location", scene: "city", region: null });
  if (text(education.school)) {
    // The street frame is baked only when there is a street (scripts/bake-pixel.ts).
    chapters.push({ id: "campus", hash: "campus", aliases: ["descent"], name: "Campus", kind: "campus", scene: area?.street ? "street" : "city", region: null });
  }
  if (text(owner.intro)) chapters.push({ id: "about", hash: "about", aliases: [], name: "About", kind: "about", scene: "figure", region: null });
  for (const stop of buildTourStops(isProd, Infinity)) {
    if (stop.kind === "intro") continue;
    chapters.push({ id: stop.id, hash: stop.id, aliases: [], name: stop.title, kind: "stop", scene: "figure", region: stop.region, stop });
  }
  chapters.push({ id: "body", hash: "body", aliases: [], name: "Explore", kind: "body", scene: "figure", region: null });
  chapters.push({ id: "contact", hash: "contact", aliases: ["outro"], name: "Contact", kind: "contact", scene: "figure", region: null });

  // Hashes of the act layout whose place is now a chapter that may be missing: each lands
  // on the first chapter of its list that exists.
  const fallbacks: [string, string[]][] = [
    ["becoming", ["about", "build", "body"]],
    ["profile", ["about", "build", "body"]],
    ["activities", ["play", "about", "body"]],
  ];
  for (const [alias, targets] of fallbacks) {
    const target = targets.map((id) => chapters.find((c) => c.id === id)).find(Boolean);
    target?.aliases.push(alias);
  }
  return chapters;
}

export const CHAPTERS = buildChapters();

/** A chapter's index by id, or -1. */
export function chapterIndex(id: string): number {
  return CHAPTERS.findIndex((c) => c.id === id);
}

export type ChapterLink = { chapter: number; region: string | null };

/** Parses `#about`, `#body/<regionId>` or an older alias (`#descent`) into a chapter. Unknown hashes return null. */
export function parseChapterHash(hash: string, chapters: Chapter[] = CHAPTERS): ChapterLink | null {
  const [raw, region] = hash.replace(/^#/, "").split("/");
  if (!raw) return null;
  const chapter = chapters.findIndex((c) => c.hash === raw || c.aliases.includes(raw));
  if (chapter === -1) return null;
  return { chapter, region: chapters[chapter]!.kind === "body" && region ? region : null };
}

/** The hash for a chapter, with the open body-map panel's region when there is one. */
export function chapterHash(index: number, openPanel: string | null, chapters: Chapter[] = CHAPTERS): string {
  const chapter = chapters[index]!;
  return chapter.kind === "body" && openPanel ? `body/${openPanel}` : chapter.hash;
}

/** Where the reading line sits within the window, as a share of its height. */
export const READING_LINE = 0.5;

/**
 * The reading position in chapter units, from each chapter's box on screen: 0 while the
 * first chapter's middle is at or below the reading line, i at chapter i's middle, and
 * in between in proportion. A chapter taller than the window counts its first screenful.
 */
export function readChapterP(boxes: { top: number; height: number }[], viewportHeight: number): number {
  const line = viewportHeight * READING_LINE;
  const mids = boxes.map((b) => b.top + Math.min(b.height, viewportHeight) / 2);
  if (!mids.length || line <= mids[0]!) return 0;
  for (let i = 0; i < mids.length - 1; i++) {
    if (line < mids[i + 1]!) return i + (line - mids[i]!) / (mids[i + 1]! - mids[i]!);
  }
  return mids.length - 1;
}

/** The chapter the reader is in: the nearest whole chapter. */
export function chapterAt(p: number, count = CHAPTERS.length): number {
  return Math.min(count - 1, Math.max(0, Math.round(p)));
}
