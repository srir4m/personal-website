import { z } from "zod";

/** A polygon in figure coordinates normalised to 0–1 of the viewBox (PRD Act 5). */
const Point = z.tuple([z.number().min(-0.1).max(1.1), z.number().min(-0.1).max(1.1)]);
export const PolygonSchema = z.array(Point).min(3);

export const BODY_REGION_IDS = ["head", "ears", "heart", "chest", "spine", "arms", "stomach", "legs", "feet"] as const;
export const MASK_IDS = ["poseNow", "poseReaching"] as const;

export const RegionsSchema = z.object({
  regions: z.object(
    Object.fromEntries(BODY_REGION_IDS.map((id) => [id, z.array(PolygonSchema)])) as Record<
      (typeof BODY_REGION_IDS)[number],
      z.ZodArray<typeof PolygonSchema>
    >,
  ),
  masks: z.object({ poseNow: z.array(PolygonSchema), poseReaching: z.array(PolygonSchema) }),
});

export type Polygon = z.infer<typeof PolygonSchema>;
export type RegionsFile = z.infer<typeof RegionsSchema>;
export type ShapeKey = { kind: "regions"; id: (typeof BODY_REGION_IDS)[number] } | { kind: "masks"; id: (typeof MASK_IDS)[number] };
