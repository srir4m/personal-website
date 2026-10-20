/**
 * The seven acts of the master timeline (PRD §3). `share` is each act's slice of the
 * scroll. Boot has no share in the PRD table (it runs on load), so it gets a small
 * runway here, and every share is normalised against the total.
 *
 * Act layers cross-fade briefly at each boundary unless an act overrides it:
 * `enterLead` fades the act in over that share of the previous act, ending at the
 * boundary; `exitLag` fades the act out over that share of the next act, starting at it.
 */
type ActDef = {
  id: string;
  hash: string;
  name: string;
  share: number;
  settle: number;
  enterLead?: number;
  exitLag?: number;
};

export const ACTS = [
  { id: "boot", hash: "", name: "Boot", share: 5, settle: 0 },
  // PRD v1.1 decision Q2: About gets its own section, right after the name.
  { id: "about", hash: "about", name: "About", share: 10, settle: 0.6 },
  // The globe stays under P1 until the plate has taken over, then fades (PRD Act 2 handoff).
  { id: "globe", hash: "globe", name: "Globe", share: 15, settle: 0.5, exitLag: 0.08 },
  // Settles on the metro view, with the owner's area highlighted.
  { id: "descent", hash: "descent", name: "Descent", share: 20, settle: 0.42, enterLead: 0.1 },
  { id: "squad", hash: "squad", name: "Squad", share: 15, settle: 0.5 },
  { id: "becoming", hash: "becoming", name: "Becoming", share: 15, settle: 0.95 },
  { id: "body", hash: "body", name: "Body map", share: 30, settle: 0.1 },
  { id: "outro", hash: "outro", name: "Outro", share: 5, settle: 1 },
] as const satisfies readonly ActDef[];

export type ActId = (typeof ACTS)[number]["id"];
export type ActIndex = number;

/** An act's fade overrides, read without fighting the literal types of ACTS. */
export function actFades(index: ActIndex): { enterLead?: number; exitLag?: number } {
  return ACTS[index] as ActDef;
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

export type DeepLink = { act: ActIndex; region: string | null };

/** Parses `#globe`, `#body/<regionId>`, … into an act index. Unknown hashes return null. */
export function parseHash(hash: string): DeepLink | null {
  const [actHash, region] = hash.replace(/^#/, "").split("/");
  if (!actHash) return null;
  const act = ACTS.findIndex((a) => a.hash === actHash);
  if (act === -1) return null;
  return { act, region: actHash === "body" && region ? region : null };
}
