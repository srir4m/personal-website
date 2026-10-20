import { describe, expect, it } from "vitest";
import regions from "../../src/content/regions.json";
import geometry from "../../src/content/vitruvian.json";
import { BODY_REGION_IDS, RegionsSchema } from "../../src/content/regionsSchema";
import { GROIN, insidePolygon, leafPolygon } from "../../src/vitruvian/figLeaf";

describe("Vitruvian geometry", () => {
  it("follows Leonardo's layout: circle on the square's axis, touching its base", () => {
    const { circle, square } = geometry;
    expect(Math.abs(circle.cx - (square.x + square.size / 2))).toBeLessThan(square.size * 0.01);
    expect(Math.abs(circle.cy + circle.r - (square.y + square.size))).toBeLessThan(square.size * 0.03);
    expect(circle.r / square.size).toBeGreaterThan(0.55);
    expect(circle.r / square.size).toBeLessThan(0.7);
  });
});

describe("fig leaf", () => {
  it("covers all of the genitals' ink, with a margin", () => {
    const leaf = leafPolygon();
    const [cx, cy] = [800, 910];
    for (const [x, y] of GROIN) {
      // Pushed 3 units further out from the centre.
      const d = Math.hypot(x - cx, y - cy);
      const point: [number, number] = [x + ((x - cx) / d) * 3, y + ((y - cy) / d) * 3];
      expect(insidePolygon(point, leaf), `(${point.map(Math.round).join(", ")})`).toBe(true);
    }
  });
});

describe("regions.json", () => {
  it("passes the schema", () => {
    const result = RegionsSchema.safeParse(regions);
    expect(result.success, result.success ? "" : result.error.message).toBe(true);
  });

  it("gives every body region at least one polygon, and both pose masks", () => {
    for (const id of BODY_REGION_IDS) expect(regions.regions[id].length, id).toBeGreaterThan(0);
    expect(regions.masks.poseNow.length).toBeGreaterThan(0);
    expect(regions.masks.poseReaching.length).toBeGreaterThan(0);
  });
});
