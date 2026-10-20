import { content } from "../../content";
import type { Game, RegionId } from "../../content/schema";
import { renderableItems, text } from "../../content/text";
import type { BodyRegionId } from "../Act5Body/regions";

export type Glyph = "knight" | "note" | "dumbbell" | "grapple" | "mountain" | "wave" | "bowl" | "crosshair";

export type ActivityCard = {
  id: string;
  title: string;
  subtitle: string | null;
  /** The theme of the body region it comes from, e.g. "Endurance". */
  category: string;
  glyph: Glyph;
  /** The body map region holding this item's details; absent for Gaming. */
  region?: BodyRegionId;
};

/** Body regions whose items are activities (hobbies), and the glyph each draws. */
const HOBBY_REGIONS: { id: RegionId; glyph: Glyph }[] = [
  { id: "ears", glyph: "note" },
  { id: "chest", glyph: "dumbbell" },
  { id: "arms", glyph: "grapple" },
  { id: "legs", glyph: "wave" },
  { id: "stomach", glyph: "bowl" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Games with a rank filled in, as "Counter-Strike 2 · 17,000 Premier". */
export function rankedGames(games: Game[] = content.squad.games): string[] {
  return games.flatMap((g) => {
    const rank = text(g.rank);
    return rank ? [`${g.name} · ${rank}`] : [];
  });
}

/**
 * The Activities index, derived entirely from existing content: flagged items in the
 * Mind region (chess), every item in the hobby regions, and gaming last, as one activity
 * among several (PRD v1.1). Nothing here is new content.
 */
export function buildActivities(isProd = import.meta.env.PROD): ActivityCard[] {
  const regions = content.body.regions;
  const cards: ActivityCard[] = [];
  for (const item of renderableItems(regions.head.items, "now", isProd).filter((i) => i.activity)) {
    cards.push({ id: slug(item.title), title: item.title, subtitle: text(item.subtitle), category: regions.head.theme, glyph: "knight", region: "head" });
  }
  for (const { id, glyph } of HOBBY_REGIONS) {
    const region = regions[id];
    for (const item of renderableItems(region.items, "now", isProd)) {
      cards.push({
        id: slug(item.title),
        title: item.title,
        subtitle: text(item.subtitle),
        category: region.theme,
        glyph: id === "arms" && /climb/i.test(item.title) ? "mountain" : glyph,
        region: id,
      });
    }
  }
  if (content.squad.games.length) {
    cards.push({ id: "gaming", title: "Gaming", subtitle: rankedGames()[0] ?? null, category: "Play", glyph: "crosshair" });
  }
  return cards;
}
