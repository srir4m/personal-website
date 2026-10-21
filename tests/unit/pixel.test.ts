import { describe, expect, it } from "vitest";
import { CHAPTERS } from "../../src/stage/chapters";
import {
  ACCENT,
  boundaries,
  circle,
  frameAt,
  HIGH,
  INK,
  LOW,
  makeSource,
  PAPER,
  project,
  RAMP,
  sample,
  unproject,
  viewFor,
  wholeView,
  WIPE_HALF,
  wipe,
  type FrameOptions,
} from "../../src/pixel/scene";

const chapters = [{ scene: "globe" }, { scene: "city" }, { scene: "street" }, { scene: "figure" }, { scene: "figure" }] as const;
const whole = { cx: 512, cy: 512, s: 1.28 };
const options: FrameOptions = { time: 0, still: true, area: { lat: 40.71, lng: -74.01 }, views: chapters.map(() => null), whole };

describe("pixel scene timing", () => {
  it("puts a transition between each pair of chapters whose scenes differ, and nowhere else", () => {
    expect(boundaries([...chapters]).map((b) => [b.from, b.to])).toEqual([
      ["globe", "city"],
      ["city", "street"],
      ["street", "figure"],
    ]);
  });

  it("is sharp at each chapter, coarse at a transition and wipes through it", () => {
    for (const [i, c] of chapters.entries()) {
      const f = frameAt(i, [...chapters], options);
      expect(f.b).toBeNull();
      expect(f.a).toBe(c.scene);
      expect(f.res).toBe(HIGH[c.scene]);
    }
    const [cut] = boundaries([...chapters]);
    const mid = frameAt(cut!.at, [...chapters], options);
    expect(mid).toMatchObject({ a: "globe", b: "city", res: LOW });
    expect(mid.k).toBeCloseTo(0.5);
    // Far enough past the wipe, the new scene is at full sharpness.
    expect(frameAt(cut!.at + WIPE_HALF + RAMP, [...chapters], options).res).toBe(HIGH.city);
  });

  it("never changes resolution by less than a step of eight", () => {
    for (let p = 0; p <= chapters.length - 1; p += 0.01) expect(frameAt(p, [...chapters], options).res % 8).toBe(0);
  });

  it("works on the real chapter list", () => {
    const f = frameAt(CHAPTERS.length - 1, CHAPTERS, { ...options, views: CHAPTERS.map(() => null) });
    expect(f.a).toBe(CHAPTERS.at(-1)!.scene);
    expect(f.draw).toBe(1);
  });
});

describe("pixel scene drawing", () => {
  it("round-trips a point through the orthographic projection", () => {
    const D = Math.PI / 180;
    const lat0 = 30 * D, lng0 = -60 * D;
    const p = project(40.71 * D, -74.01 * D, lat0, lng0)!;
    const [lat, lng] = unproject(p[0], p[1], lat0, lng0)!;
    expect(lat / D).toBeCloseTo(40.71, 4);
    expect(lng / D).toBeCloseTo(-74.01, 4);
    expect(project(40.71 * D, 106 * D, lat0, lng0)).toBeNull();
  });

  it("letterboxes a source onto a power-of-two square of paper and keeps thin lines in line mode", () => {
    const w = 300, h = 200, rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 0; y < h; y++) rgba.fill(0, (y * w + 150) * 4, (y * w + 150) * 4 + 3); // a one-pixel black line
    const src = makeSource(rgba, w, h);
    expect(src.size).toBe(512);
    const view = wholeView(src.size, w, h);
    const grid = sample(src, 64, view, [0.3, 0.5, 0.82], "line");
    expect([...grid].filter((v) => v === INK).length).toBeGreaterThan(20);
    expect(sample(src, 64, view, [0.3, 0.5, 0.82], "mean").every((v) => v === PAPER || v > INK)).toBe(true);
  });

  it("frames a region between the whole view's zoom and three times it, inside the drawing", () => {
    const tiny = viewFor({ x0: 500, y0: 500, x1: 510, y1: 510 }, 1024, whole);
    expect(tiny.s).toBeCloseTo(3 * whole.s);
    const edge = viewFor({ x0: 0, y0: 0, x1: 100, y1: 100 }, 1024, whole);
    expect(edge.cx - 1024 / (2 * edge.s)).toBeGreaterThanOrEqual(512 - 1024 / (2 * whole.s) - 1e-6);
    expect(viewFor(null, 1024, whole)).toEqual(whole);
  });

  it("draws a circle in the accent and wipes top to bottom", () => {
    const res = 64, g = new Uint8Array(res * res).fill(PAPER);
    circle(g, res, { cx: 512, cy: 512, s: 1 }, 1024, { cx: 512, cy: 512, r: 400 }, 1, false);
    expect(g.filter((v) => v === ACCENT).length).toBeGreaterThan(100);
    const a = new Uint8Array(res * res).fill(PAPER), b = new Uint8Array(res * res).fill(INK);
    const half = wipe(a, b, res, 0.5);
    expect(half[0]).toBe(INK);
    expect(half[res * res - 1]).toBe(PAPER);
    expect(wipe(a, b, res, 1).every((v) => v === INK)).toBe(true);
  });
});
