import { content } from "../content";
import type { Item, RegionId } from "../content/schema";
import { renderableItems, text } from "../content/text";

/**
 * The tour's stops (redesign, issue #8): after Becoming, the scroll walks through the
 * figure one region at a time, each region's content beside it. Built only from
 * site-content.json; a region with nothing to show is skipped. No geometry here (that
 * lives with the act), so the stage can size the tour without loading the regions.
 */
export type TourStop = {
  id: string;
  /** The body region the camera frames; null frames the whole figure. */
  region: RegionId | "heart" | null;
  /** The region's name, shown as the stop's eyebrow ("Mind", "Backbone"). */
  label: string | null;
  title: string;
  kind: "intro" | "items" | "play" | "vault";
  items: Item[];
  /** A long list reads over several pages, the camera holding still: [page, of]. */
  page?: [number, number];
  /** Relative share of the tour's scroll: stops with more to read get more. */
  weight: number;
};

const now = (items: Item[], isProd: boolean) => renderableItems(items, "now", isProd);

/** At most this many items per stop, so every stop reads on one screen, even a small phone's. */
export const PAGE_SIZE = 3;

/** A region's items as one stop, or as consecutive pages of `size`. */
function paged(stop: Omit<TourStop, "page">, perItem = 0.45, size = PAGE_SIZE): TourStop[] {
  const pages = Math.ceil(stop.items.length / size);
  if (pages <= 1) return [{ ...stop, weight: Math.max(stop.weight, 0.6 + perItem * stop.items.length) }];
  return Array.from({ length: pages }, (_, i) => {
    const items = stop.items.slice(i * size, (i + 1) * size);
    return { ...stop, id: `${stop.id}-${i + 1}`, items, page: [i + 1, pages] as [number, number], weight: 0.6 + perItem * items.length };
  });
}

// `import.meta.env` is Vite's; Node (the e2e specs import the act layout) has none, so count as production.
// `pageSize`: the pixel layout's chapters scroll, so they take each region whole (Infinity).
export function buildTourStops(isProd = import.meta.env?.PROD ?? true, pageSize = PAGE_SIZE): TourStop[] {
  const regions = content.body.regions;
  const stops: TourStop[] = [];
  const name = text(content.owner.name);
  if (text(content.owner.intro)) stops.push({ id: "intro", region: null, label: null, title: name ?? "About", kind: "intro", items: [], weight: 1.3 });

  // The Mind holds both what the owner builds and what they play: two stops, one region.
  const mind = now(regions.head.items, isProd);
  const build = mind.filter((item) => !item.activity);
  const play = mind.filter((item) => item.activity);
  if (build.length) stops.push(...paged({ id: "build", region: "head", label: regions.head.label, title: "What I build", kind: "items", items: build, weight: 1 }, undefined, pageSize));
  const spine = now(regions.spine.items, isProd);
  if (spine.length) stops.push(...paged({ id: "spine", region: "spine", label: regions.spine.label, title: regions.spine.theme, kind: "items", items: spine, weight: 1 }, undefined, pageSize));
  if (play.length || content.squad.games.length)
    stops.push({ id: "play", region: "head", label: regions.head.label, title: "What I play", kind: "play", items: play, weight: 1.2 });
  for (const id of ["ears", "arms", "chest", "legs", "stomach", "feet"] as const) {
    const items = now(regions[id].items, isProd);
    if (items.length) stops.push(...paged({ id, region: id, label: regions[id].label, title: regions[id].theme, kind: "items", items, weight: 0.8 }, 0.25, pageSize));
  }
  stops.push({ id: "heart", region: "heart", label: "Heart", title: "The vault", kind: "vault", items: [], weight: 0.9 });
  return stops;
}

export const TOUR_STOPS = buildTourStops();

/**
 * Where each stop sits in the tour act, as fractions of the act: [start, end), plus a
 * closing passage in which the camera pulls back to the whole figure for the body map.
 */
const CLOSING_WEIGHT = 0.8;
const TOTAL_WEIGHT = TOUR_STOPS.reduce((s, stop) => s + stop.weight, 0) + CLOSING_WEIGHT;
export const STOP_RANGES = TOUR_STOPS.reduce<{ start: number; end: number }[]>((ranges, stop) => {
  const start = ranges.at(-1)?.end ?? 0;
  ranges.push({ start, end: start + stop.weight / TOTAL_WEIGHT });
  return ranges;
}, []);
/** The share of the act from which the camera pulls back to the whole figure. */
export const CLOSING_START = STOP_RANGES.at(-1)!.end;

/** Within a stop: the camera arrives, then the text reads in, holds, and reads out. */
export const STOP_PHASES = { arrive: 0.32, textIn: 0.3, textInEnd: 0.42, textOut: 0.9, settle: 0.62 } as const;

/** Each stop's settled point as a fraction of the tour act (deep links and Calm mode stop here). */
export const STOP_SETTLES = STOP_RANGES.map((r) => r.start + (r.end - r.start) * STOP_PHASES.settle);
