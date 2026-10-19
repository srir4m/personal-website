/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
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

export default defineConfig({
  plugins: [contentValidation(), react(), tailwindcss()],
  build: {
    // three.js makes the globe chunk large by nature; scripts/check-budget.ts enforces the real budget.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
