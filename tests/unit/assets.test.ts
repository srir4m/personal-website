import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import geometry from "../../src/content/vitruvian.json";

const kb = (path: string) => statSync(path).size / 1024;

describe("baked pixel frames (pixel move, #8)", () => {
  const manifest = JSON.parse(readFileSync("public/assets/pixel/pixel.json", "utf8"));

  it("has every frame the scene samples, each small", () => {
    for (const name of ["city", "street", "figure"]) expect(kb(`public/assets/pixel/${name}.webp`), name).toBeLessThan(400);
  });

  it("matches the figure's geometry at half scale", () => {
    expect(manifest.figure.circle.r).toBeCloseTo(geometry.circle.r / 2, 0);
    expect(manifest.figure.w).toBe(geometry.viewBox[2]! / 2);
  });

  it("keeps the map attribution", () => {
    expect(manifest.credit).toMatch(/OpenStreetMap contributors/);
  });
});

describe("asset budgets (PRD §10.3)", () => {
  it("keeps the self-hosted map tiles within a GitHub Pages-friendly size", () => {
    const total = readdirSync("public/assets/map")
      .filter((file) => file.endsWith(".pmtiles"))
      .reduce((sum, file) => sum + kb(`public/assets/map/${file}`), 0);
    expect(total / 1024).toBeLessThan(60);
  });

  it("keeps the figure and globe data within reason", () => {
    expect(kb("public/assets/vitruvian/figure.webp")).toBeLessThan(900);
    expect(kb("public/assets/globe/coastlines.bin")).toBeLessThan(400);
    expect(kb("public/assets/globe/land-mask.png")).toBeLessThan(200);
  });
});
