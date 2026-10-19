import { readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const kb = (path: string) => statSync(path).size / 1024;

describe("asset budgets (PRD §10.3)", () => {
  it("keeps every plate under 400 KB", () => {
    for (const file of readdirSync("public/assets/plates")) {
      expect(kb(`public/assets/plates/${file}`), file).toBeLessThan(400);
    }
  });

  it("keeps the traced figure and globe data within reason", () => {
    expect(kb("public/assets/vitruvian/figure.svg")).toBeLessThan(600);
    expect(kb("public/assets/globe/coastlines.bin")).toBeLessThan(400);
    expect(kb("public/assets/globe/land-mask.png")).toBeLessThan(200);
  });
});
