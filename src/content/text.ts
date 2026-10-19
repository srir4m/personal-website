import type { Item } from "./schema";

/** True for owner placeholders: `null`, `undefined`, empty, or any string starting with "TODO". */
export function isPlaceholder(value: string | null | undefined): value is null | undefined {
  return value == null || value.trim() === "" || /^TODO\b/i.test(value.trim());
}

/** Returns the string if it should reach the DOM, otherwise `null`. */
export function text(value: string | null | undefined): string | null {
  return isPlaceholder(value) ? null : value;
}

export type PoseMode = "now" | "reaching";

/**
 * Items that may render for a pose mode. Drafts never render in production; in dev they
 * do, so the owner can preview them. An item whose title is a placeholder never renders.
 */
export function renderableItems(items: Item[], mode: PoseMode, isProd: boolean): Item[] {
  return items.filter((item) => {
    if (isProd && item.draft) return false;
    if (isPlaceholder(item.title)) return false;
    return (item.mode ?? "now") === mode;
  });
}
