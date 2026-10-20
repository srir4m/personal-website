import type { Glyph as GlyphName } from "./activities";

/** Small engraved glyphs for the activity cards, drawn in ink on a 32-unit grid. */
const PATHS: Record<GlyphName, string> = {
  knight: "M10 27h13M11 24h11l-1-6c3-2 4-5 3-9-2-4-6-5-9-4l-3 2-3 5 3 1 3-2-1 4-4 5z",
  note: "M12 24V8l12-3v16M12 24a3 2.5 0 1 1-6 0 3 2.5 0 1 1 6 0M24 21a3 2.5 0 1 1-6 0 3 2.5 0 1 1 6 0M12 12l12-3",
  dumbbell: "M4 16h24M7 11v10M10 9v14M22 9v14M25 11v10",
  grapple: "M5 20c4-1 6-4 9-4s3 3 6 3 5-3 8-4M9 12l3 4M23 12l-3 4M12 24l2-4M20 24l-2-4",
  mountain: "M3 26l9-14 5 7 3-4 9 11zM12 12l2 4M20 15l2 3",
  wave: "M3 12c3-3 5-3 8 0s5 3 8 0 5-3 8 0M3 18c3-3 5-3 8 0s5 3 8 0 5-3 8 0M3 24c3-3 5-3 8 0s5 3 8 0 5-3 8 0",
  bowl: "M5 15h22c0 6-5 10-11 10S5 21 5 15zM12 25l-1 3h10l-1-3M20 13l6-8M22 13l7-6",
  compass: "M16 5a11 11 0 1 0 0.01 0M16 8l3 8-3 8-3-8zM13 16h6",
  crosshair: "M16 4v8M16 20v8M4 16h8M20 16h8M16 9a7 7 0 1 0 0.01 0",
};

export function Glyph({ name, className = "" }: { name: GlyphName; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`activity-glyph ${className}`} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Neutral placeholder emblems for games without an owner-supplied logo (PRD §8.4): never imitations. */
const EMBLEM_SHAPES: Record<string, string> = {
  cs2: "M16 5v7M16 20v7M5 16h7M20 16h7M16 10a6 6 0 1 0 .01 0",
  valorant: "M16 4l10 12-10 12L6 16z",
  r6: "M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8z",
  minecraft: "M16 4l10 5v12l-10 5-10-5V9zM6 9l10 5 10-5M16 14v12",
  roblox: "M7 7h18v18H7zM13 13h6v6h-6z",
};

export function EmblemGlyph({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 32 32" className="emblem-glyph" aria-hidden="true">
      <path d={EMBLEM_SHAPES[id] ?? "M8 8h16v16H8z"} />
    </svg>
  );
}
