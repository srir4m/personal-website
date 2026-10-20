import { readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const kb = (path: string) => statSync(path).size / 1024;

describe("asset budgets (PRD §10.3)", () => {
  it("keeps the self-hosted map tiles within a GitHub Pages-friendly size", () => {
    const total = readdirSync("public/assets/map")
      .filter((file) => file.endsWith(".pmtiles"))
      .reduce((sum, file) => sum + kb(`public/assets/map/${file}`), 0);
    expect(total / 1024).toBeLessThan(60);
  });

  it("keeps the traced figure and globe data within reason", () => {
    expect(kb("public/assets/vitruvian/figure.svg")).toBeLessThan(600);
    expect(kb("public/assets/globe/coastlines.bin")).toBeLessThan(400);
    expect(kb("public/assets/globe/land-mask.png")).toBeLessThan(200);
  });
});
