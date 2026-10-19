import { z } from "zod";

/** A string the owner may not have filled in yet: `null` and "TODO" both render as nothing (PRD §6.3). */
const optionalText = z.string().nullable().optional();

export const ItemSchema = z.object({
  title: z.string(),
  subtitle: optionalText,
  body: optionalText,
  badge: optionalText,
  link: z.url().nullable().optional(),
  mode: z.enum(["now", "reaching"]).optional(),
  draft: z.boolean().optional(),
});

export const RegionSchema = z.object({
  label: z.string(),
  theme: z.string(),
  items: z.array(ItemSchema),
});

export const CourseSchema = z.object({
  code: z.string(),
  title: z.string().nullable(),
  term: z.string(),
  termOrder: z.number().int(),
  status: z.enum(["completed", "in-progress"]),
});

export const GameSchema = z.object({
  id: z.string(),
  name: z.string(),
  emblem: z.string().startsWith("/assets/games/"),
  main: z.string().nullable(),
  rank: z.string().nullable(),
  story: z.string().nullable(),
});

export const REGION_IDS = ["head", "ears", "chest", "spine", "arms", "stomach", "legs", "feet"] as const;

export const SiteContentSchema = z.object({
  version: z.string(),
  owner: z.object({
    name: z.string().nullable(),
    tagline: z.string().nullable(),
    contact: z.object({
      email: z.email().nullable(),
      github: z.url().nullable(),
      linkedin: z.url().nullable(),
    }),
  }),
  education: z.object({
    school: z.string(),
    degree: z.string().nullable(),
    classOf: z.string().nullable(),
    location: z.object({
      label: z.string(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    courses: z.array(CourseSchema),
  }),
  squad: z.object({
    intro: z.string().nullable(),
    silhouetteCount: z.number().int().min(4).max(6).default(5),
    games: z.array(GameSchema),
  }),
  body: z.object({
    regions: z.object(Object.fromEntries(REGION_IDS.map((id) => [id, RegionSchema])) as Record<
      (typeof REGION_IDS)[number],
      typeof RegionSchema
    >),
  }),
});

export type Item = z.infer<typeof ItemSchema>;
export type Region = z.infer<typeof RegionSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Game = z.infer<typeof GameSchema>;
export type SiteContent = z.infer<typeof SiteContentSchema>;
export type RegionId = (typeof REGION_IDS)[number];

export type ValidationResult = { ok: true; data: SiteContent } | { ok: false; error: string };

export function validateContent(raw: unknown): ValidationResult {
  const result = SiteContentSchema.safeParse(raw);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: z.prettifyError(result.error) };
}
