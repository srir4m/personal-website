import { STOP_RANGES, STOP_SETTLES } from "./tour";

/**
 * The acts of the master timeline. `share` is each act's slice of the scroll, normalised
 * against the total. The redesign (issue #8) is one continuous zoom from the world into
 * the person: the globe narrows to the owner's area, its circle becomes the Vitruvian
 * circle, and the tour walks through the figure one region at a time.
 *
 * By default an act hands over by fading through the parchment: the outgoing act fades
 * out just before the boundary and the incoming one fades in just after it, so two
 * unrelated scenes never double-expose. Where the two frames match, the incoming act
 * dissolves over the outgoing one instead: `enterLead` fades the act in over that share
 * of the previous act, ending at the boundary; `exitLag` fades the act out over that
 * share of the next act, starting at it.
 *
 * `stops` (the tour) splits an act into segments, each with its own settle point, so deep
 * links and Calm mode can rest on every stop rather than only on the act.
 */
type ActDef = {
  id: string;
  hash: string;
  name: string;
  share: number;
  settle: number;
  enterLead?: number;
  exitLag?: number;
  stops?: { ranges: { start: number; end: number }[]; settles: number[] };
};

export const ACTS = [
  { id: "boot", hash: "", name: "Home", share: 4, settle: 0 },
  // The globe stays under the map until the map has taken over, then fades.
  { id: "globe", hash: "globe", name: "Location", share: 12, settle: 0.5, exitLag: 0.08 },
  // Settles on the metro view, with the owner's area highlighted.
  { id: "descent", hash: "descent", name: "Descent", share: 14, settle: 0.42, enterLead: 0.1 },
  { id: "becoming", hash: "becoming", name: "Becoming", share: 10, settle: 0.95 },
  // Becoming ends on the whole figure the tour opens on: dissolve.
  {
    id: "tour",
    hash: "profile",
    name: "Profile",
    share: 46,
    settle: STOP_SETTLES[0]!,
    enterLead: 0.04,
    stops: { ranges: STOP_RANGES, settles: STOP_SETTLES },
  },
  // The tour ends on the same whole figure the body map shows: dissolve.
  { id: "body", hash: "body", name: "Body map", share: 9, settle: 0.4, enterLead: 0.02 },
  // The Outro opens on the body map's figure before its montage plays: dissolve.
  { id: "outro", hash: "outro", name: "Contact", share: 5, settle: 1, enterLead: 0.04 },
] as const satisfies readonly ActDef[];

export type ActId = (typeof ACTS)[number]["id"];
export type ActIndex = number;

/** An act's fade overrides, read without fighting the literal types of ACTS. */
export function actFades(index: ActIndex): { enterLead?: number; exitLag?: number } {
  return ACTS[index] as ActDef;
}

/** An act's stops, if it has any. */
function actStops(index: ActIndex): ActDef["stops"] {
  return (ACTS[index] as ActDef).stops;
}

const TOTAL = ACTS.reduce((sum, act) => sum + act.share, 0);

/** Normalised [start, end) of each act on the master timeline (0–1). */
export const ACT_RANGES = ACTS.reduce<{ start: number; end: number }[]>((ranges, act) => {
  const start = ranges.at(-1)?.end ?? 0;
  ranges.push({ start, end: start + act.share / TOTAL });
  return ranges;
}, []);

/** How many viewport heights of scroll the whole timeline spans. */
export const SCROLL_VIEWPORTS = 14;

/** An act's index by id, so code never hard-codes positions in the act order. */
export function actIndex(id: ActId): ActIndex {
  return ACTS.findIndex((act) => act.id === id);
}

/** An act's normalised range on the master timeline, by id. */
export function rangeOf(id: ActId): { start: number; end: number } {
  return ACT_RANGES[actIndex(id)]!;
}

export function actAt(progress: number): ActIndex {
  const index = ACT_RANGES.findIndex((r) => progress < r.end);
  return index === -1 ? ACTS.length - 1 : index;
}

/** Master-timeline progress at which an act is in its settled state (used by deep links). */
export function settleProgress(index: ActIndex): number {
  const range = ACT_RANGES[index]!;
  return range.start + (range.end - range.start) * ACTS[index]!.settle;
}

/**
 * Every point the stage can rest on, in order: each act's settle point, or each of its
 * stops. `from` is where the point's segment starts on the master timeline.
 */
export const REST_POINTS: { act: ActIndex; at: number; from: number }[] = ACTS.flatMap((_, act) => {
  const range = ACT_RANGES[act]!;
  const length = range.end - range.start;
  const stops = actStops(act);
  if (!stops) return [{ act, at: settleProgress(act), from: range.start }];
  return stops.settles.map((settle, i) => ({ act, at: range.start + length * settle, from: range.start + length * stops.ranges[i]!.start }));
});

/** The rest point whose segment holds `progress` (Calm mode snaps to it). */
export function restPointAt(progress: number): number {
  let point = REST_POINTS[0]!;
  for (const p of REST_POINTS) if (p.from <= progress) point = p;
  return point.at;
}

export type DeepLink = { act: ActIndex; region: string | null };

/** Earlier hashes that now live inside another act, so old links keep working. */
const HASH_ALIASES: Record<string, string> = { about: "profile", activities: "profile" };

/** Parses `#globe`, `#body/<regionId>`, … into an act index. Unknown hashes return null. */
export function parseHash(hash: string): DeepLink | null {
  const [raw, region] = hash.replace(/^#/, "").split("/");
  if (!raw) return null;
  const actHash = HASH_ALIASES[raw] ?? raw;
  const act = ACTS.findIndex((a) => a.hash === actHash);
  if (act === -1) return null;
  return { act, region: actHash === "body" && region ? region : null };
}
