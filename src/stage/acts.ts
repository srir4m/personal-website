/**
 * The seven acts of the master timeline (PRD §3). `share` is each act's slice of the
 * scroll. Boot has no share in the PRD table (it runs on load), so it gets a small
 * runway here, and every share is normalised against the total.
 */
export const ACTS = [
  { id: "boot", hash: "", name: "Boot", share: 5, settle: 0 },
  { id: "globe", hash: "globe", name: "Globe", share: 15, settle: 0.5 },
  { id: "descent", hash: "descent", name: "Descent", share: 20, settle: 0.5 },
  { id: "squad", hash: "squad", name: "Squad", share: 15, settle: 0.5 },
  { id: "becoming", hash: "becoming", name: "Becoming", share: 15, settle: 0.95 },
  { id: "body", hash: "body", name: "Body map", share: 30, settle: 0.1 },
  { id: "outro", hash: "outro", name: "Outro", share: 5, settle: 1 },
] as const;

export type ActId = (typeof ACTS)[number]["id"];
export type ActIndex = number;

const TOTAL = ACTS.reduce((sum, act) => sum + act.share, 0);

/** Normalised [start, end) of each act on the master timeline (0–1). */
export const ACT_RANGES = ACTS.reduce<{ start: number; end: number }[]>((ranges, act) => {
  const start = ranges.at(-1)?.end ?? 0;
  ranges.push({ start, end: start + act.share / TOTAL });
  return ranges;
}, []);

/** How many viewport heights of scroll the whole timeline spans. */
export const SCROLL_VIEWPORTS = 14;

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
