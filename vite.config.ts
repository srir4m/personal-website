/// <reference types="vitest/config" />
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { validateContent } from "./src/content/schema.ts";
import { RegionsSchema } from "./src/content/regionsSchema.ts";

const contentPath = fileURLToPath(new URL("./src/content/site-content.json", import.meta.url));

/** Fails dev and build with a readable error when site-content.json is invalid (PRD §6.1). */
function contentValidation(): Plugin {
  const check = () => {
    const result = validateContent(JSON.parse(readFileSync(contentPath, "utf8")));
    if (!result.ok) throw new Error(`site-content.json failed validation:\n${result.error}`);
  };
  return {
    name: "microcosm:content-validation",
    buildStart: check,
    handleHotUpdate(ctx) {
      if (ctx.file === contentPath) check();
    },
  };
}

/** The public address of the site, for absolute social preview URLs. */
const SITE_URL = process.env.SITE_URL ?? "https://srir4m.github.io/";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Page title, description and social preview tags, all from site-content.json, so nothing
 * personal is written into the HTML by hand. The description is the first sentence of the intro.
 */
function siteMeta(): Plugin {
  const filled = (v: unknown) => (typeof v === "string" && v.trim() && !/^TODO\b/.test(v) ? v.trim() : null);
  return {
    name: "microcosm:site-meta",
    transformIndexHtml(html, ctx) {
      const { owner } = JSON.parse(readFileSync(contentPath, "utf8"));
      const name = filled(owner.name) ?? "Microcosm";
      const tagline = filled(owner.tagline);
      const title = tagline ? `${name} · ${tagline}` : name;
      const description = filled(owner.intro)?.split(/(?<=\.)\s/)[0] ?? tagline;
      const page = ctx.path.endsWith("404.html") ? `Not found · ${name}` : title;
      const meta = (attr: "name" | "property", key: string, value: string | null) =>
        value ? [{ tag: "meta", attrs: { [attr]: key, content: value }, injectTo: "head" as const }] : [];
      return {
        html: html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(page)}</title>`),
        tags: [
          ...meta("name", "description", description),
          ...meta("property", "og:type", "website"),
          ...meta("property", "og:url", SITE_URL),
          ...meta("property", "og:title", title),
          ...meta("property", "og:description", description),
          ...meta("property", "og:image", new URL("og.png", SITE_URL).href),
          ...meta("property", "og:image:width", "1200"),
          ...meta("property", "og:image:height", "630"),
          ...meta("property", "og:image:alt", `${title}: Leonardo's Vitruvian Man rising from an engraved globe`),
          ...meta("name", "twitter:card", "summary_large_image"),
        ],
      };
    },
  };
}

/**
 * Dev-only endpoint for the region editor (`/?edit=regions`): POST the edited regions
 * to write src/content/regions.json, after validating them.
 */
function regionsEndpoint(): Plugin {
  const file = fileURLToPath(new URL("./src/content/regions.json", import.meta.url));
  return {
    name: "microcosm:regions-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__regions", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const result = RegionsSchema.safeParse(JSON.parse(body));
          if (!result.success) {
            res.statusCode = 400;
            res.end(result.error.message);
            return;
          }
          writeFileSync(file, `${JSON.stringify(result.data, null, 2)}\n`);
          res.end("saved");
        });
      });
    },
  };
}

/**
 * `virtual:vault` is the encrypted heart vault (PRD §9), or null when there is none. The
 * e2e build (`--mode e2e`) uses the test fixture instead, so tests never touch the real vault.
 */
function vaultModule(mode: string): Plugin {
  const id = "virtual:vault";
  const file = fileURLToPath(
    new URL(mode === "e2e" ? "./tests/fixtures/vault.enc.json" : "./src/content/vault.enc.json", import.meta.url),
  );
  return {
    name: "microcosm:vault",
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return undefined;
      if (!existsSync(file)) return "export default null;";
      this.addWatchFile(file);
      return `export default ${readFileSync(file, "utf8")};`;
    },
  };
}

/**
 * `virtual:game-emblems`: which owner-supplied emblem files exist in public/assets/games
 * (PRD §8.4), so the page shows a neutral glyph instead of requesting a missing file.
 */
function gameEmblems(): Plugin {
  const id = "virtual:game-emblems";
  const dir = fileURLToPath(new URL("./public/assets/games/", import.meta.url));
  return {
    name: "microcosm:game-emblems",
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return undefined;
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.(svg|png|webp|avif)$/.test(f)) : [];
      return `export default ${JSON.stringify(files)};`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  // The site is served from the root of srir4m.github.io; BASE_PATH overrides it (e.g. "./" for previews).
  base: process.env.BASE_PATH ?? "/",
  plugins: [contentValidation(), siteMeta(), vaultModule(mode), regionsEndpoint(), gameEmblems(), react(), tailwindcss()],
  build: {
    // three.js makes the globe chunk large by nature; scripts/check-budget.ts enforces the real budget.
    chunkSizeWarningLimit: 1200,
    // dist/.vite/manifest.json lets scripts/check-budget.ts follow the real chunk graph.
    manifest: true,
    // 404.html is GitHub Pages' not-found page: built like the main page so it gets the fonts and base path.
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        notFound: fileURLToPath(new URL("./404.html", import.meta.url)),
      },
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
}));
