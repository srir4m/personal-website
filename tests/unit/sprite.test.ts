import { describe, expect, it } from "vitest";
import { CLEAR, FLAP, FLAP_PX, GLIDE_MS, POSES, poseFor, SPRITE_H, SPRITE_W, targetFor } from "../../src/pixel/sprite";
import { ACCENT, PAPER } from "../../src/pixel/scene";

describe("the companion sprite", () => {
  it("has every pose at the sprite's size, with the red pennant and a paper outline", () => {
    for (const grid of Object.values(POSES)) {
      expect(grid.length).toBe(SPRITE_W * SPRITE_H);
      expect(grid.includes(ACCENT)).toBe(true);
      expect(grid.includes(PAPER)).toBe(true);
      expect(grid.includes(CLEAR)).toBe(true);
    }
  });

  it("raises its wings in the up pose and lowers them in the down pose", () => {
    const topRow = (grid: Uint8Array) => Math.floor(grid.findIndex((v) => v !== CLEAR && v !== ACCENT && v !== PAPER) / SPRITE_W);
    expect(topRow(POSES.up)).toBeLessThan(topRow(POSES.mid));
    // Its wingtips (the outer quarter on the left) reach lower when the wings are down.
    const tipRow = (grid: Uint8Array) => {
      for (let y = SPRITE_H - 1; y >= 0; y--) for (let x = 0; x < SPRITE_W / 4; x++) if (grid[y * SPRITE_W + x] !== CLEAR) return y;
      return -1;
    };
    expect(tipRow(POSES.down)).toBeGreaterThan(tipRow(POSES.mid));
  });

  it("flaps only while scrolling, glides when still, and folds once perched", () => {
    const base = { perched: false, arrived: false, still: false, sinceScroll: 0, travelled: 0 };
    expect(FLAP.map((_, i) => poseFor({ ...base, travelled: i * FLAP_PX }))).toEqual(FLAP);
    expect(poseFor({ ...base, sinceScroll: GLIDE_MS + 1 })).toBe("mid");
    expect(poseFor({ ...base, still: true, travelled: FLAP_PX * 2 })).toBe("mid");
    expect(poseFor({ ...base, perched: true, arrived: false })).not.toBe("folded");
    expect(poseFor({ ...base, perched: true, arrived: true })).toBe("folded");
  });

  it("perches just after the Contact title's last letter, inside the column", () => {
    const size = { w: 200, h: 130 };
    const common = { phone: false, scrollY: 0, viewport: { w: 1440, h: 900 }, column: { right: 760 }, size };
    const at = targetFor({ ...common, perched: true, perch: { left: 190, right: 390, top: 380, bottom: 420 } });
    expect(at.x + size.w * 0.22).toBeGreaterThan(390);
    expect(at.x + size.w * 0.78).toBeLessThan(760);
    // A title running to the column's edge: it perches above the title instead.
    const tight = targetFor({ ...common, perched: true, perch: { left: 190, right: 740, top: 380, bottom: 420 } });
    expect(tight.y + size.h * 0.8).toBeLessThanOrEqual(380);
    // Reading: beside the column on desktop, top right on phones.
    expect(targetFor({ ...common, perched: false, perch: null }).x).toBeGreaterThan(760);
    expect(targetFor({ ...common, phone: true, viewport: { w: 390, h: 844 }, perched: false, perch: null }).x).toBe(390 - size.w - 14);
  });
});
