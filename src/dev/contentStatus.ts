export type StatusEntry = { path: string; kind: "null" | "TODO" | "draft" };

/** Walks the raw content and lists every null, TODO and draft field (PRD §6.3). */
export function collectStatus(value: unknown, path = ""): StatusEntry[] {
  if (value === null) return [{ path, kind: "null" }];
  if (typeof value === "string") return /^TODO\b/i.test(value.trim()) ? [{ path, kind: "TODO" }] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStatus(v, `${path}[${i}]`));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const own: StatusEntry[] = record.draft === true ? [{ path, kind: "draft" }] : [];
    return own.concat(
      Object.entries(record).flatMap(([key, v]) => collectStatus(v, path ? `${path}.${key}` : key)),
    );
  }
  return [];
}

