/// <reference types="vitest/config" />
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { validateContent } from "./src/content/schema.ts";

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

export default defineConfig(({ mode }) => ({
  plugins: [contentValidation(), vaultModule(mode), react(), tailwindcss()],
  build: {
    // three.js makes the globe chunk large by nature; scripts/check-budget.ts enforces the real budget.
    chunkSizeWarningLimit: 1200,
    // dist/.vite/manifest.json lets scripts/check-budget.ts follow the real chunk graph.
    manifest: true,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
}));
