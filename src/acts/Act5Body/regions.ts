import { content } from "../../content";
import regionsFile from "../../content/regions.json";
import type { Item } from "../../content/schema";
import { renderableItems, type PoseMode } from "../../content/text";
import { BODY_REGION_IDS, type Polygon, type RegionsFile } from "../../content/regionsSchema";
import { VITRUVIAN } from "../../vitruvian/figure";

export type BodyRegionId = (typeof BODY_REGION_IDS)[number];

export type BodyRegion = {
  id: BodyRegionId;
  label: string;
  theme: string;
  /** Polygons in viewBox units. */
  polygons: Polygon[];
  /** Label anchor: the centroid of the region's polygons, in viewBox units. */
  centroid: [number, number];
  /** Content items; the heart has none (it opens the vault). */
  items: Item[];
};

const FILE = regionsFile as RegionsFile;
const [, , VB_W, VB_H] = VITRUVIAN.viewBox;
const toViewBox = (poly: Polygon): Polygon => poly.map(([x, y]) => [x * VB_W, y * VB_H]) as Polygon;

function centroid(polygons: Polygon[]): [number, number] {
  const points = polygons.flat();
  return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
}

/** The heart isn't in site-content.json: it opens the vault (PRD Act 5, §9). */
const HEART = { label: "Heart", theme: "The vault", items: [] as Item[] };

/** Regions in the PRD's tab order: head, ears, heart, chest, spine, arms, stomach, legs, feet. */
export const BODY_REGIONS: BodyRegion[] = BODY_REGION_IDS.map((id) => {
  const source = id === "heart" ? HEART : content.body.regions[id];
  const polygons = FILE.regions[id].map(toViewBox);
  return { id, label: source.label, theme: source.theme, items: source.items, polygons, centroid: centroid(polygons) };
});

export const POSE_MASKS = {
  now: FILE.masks.poseNow.map(toViewBox),
  reaching: FILE.masks.poseReaching.map(toViewBox),
};

/** Items a region shows in a pose mode. Production hides drafts (PRD §6.3). */
export function regionItems(region: BodyRegion, mode: PoseMode, isProd = import.meta.env.PROD): Item[] {
  return renderableItems(region.items, mode, isProd);
}

/** A region with nothing to show in this mode is dormant: drawn, but not interactive. The heart never is. */
export function isDormant(region: BodyRegion, mode: PoseMode, isProd = import.meta.env.PROD): boolean {
  return region.id !== "heart" && regionItems(region, mode, isProd).length === 0;
}

export const pointsAttr = (poly: Polygon) => poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
