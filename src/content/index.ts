import raw from "./site-content.json";
import { validateContent, type SiteContent } from "./schema";

/**
 * The content seed. Production builds already validated it in the Vite plugin, so only
 * dev pays for Zod at runtime; the import below is tree-shaken from production.
 */
function load(): SiteContent {
  if (!import.meta.env.DEV) return raw as SiteContent;
  const result = validateContent(raw);
  if (!result.ok) throw new Error(`site-content.json failed validation:\n${result.error}`);
  return result.data;
}

export const content = load();
