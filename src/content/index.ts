import raw from "./site-content.json";
import type { SiteContent } from "./schema";

/**
 * The content seed. The Vite plugin in vite.config.ts validates it against the Zod schema
 * whenever dev starts, the file changes, or a build runs, so the client ships no Zod.
 */
export const content = raw as SiteContent;
