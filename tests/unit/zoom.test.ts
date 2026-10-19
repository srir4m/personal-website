import { describe, expect, it } from "vitest";
import { PLATES } from "../../src/acts/Act2Descent/plates";
import {
  buildSegments,
  coverPlacement,
  currentScale,
  formatScale,
  handoffPlacement,
  interpolate,
  locate,
  parentPlacementFor,
  scaleBar,
  type Placement,
} from "../../src/acts/Act2Descent/zoom";

const VIEWS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
const GLOBE_SCALE = 4_000_000;

function expectPlacement(actual: Placement, expected: Placement, tolerance = 1e-6) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(tolerance * Math.max(1, Math.abs(expected.x)));
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(tolerance * Math.max(1, Math.abs(expected.y)));
  expect(Math.abs(actual.width - expected.width) / expected.width).toBeLessThan(tolerance);
}

describe("exponential zoom", () => {
  const from = { x: 100, y: 50, width: 200 };
  const to = { x: -3000, y: -1800, width: 20_000 };

  it("hits both ends exactly", () => {
    expectPlacement(interpolate(from, to, 0), from);
    expectPlacement(interpolate(from, to, 1), to);
  });

  it("interpolates scale in log space, so zoom speed is constant", () => {
    const logs = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.log(interpolate(from, to, t).width));
    const steps = logs.slice(1).map((value, i) => value - logs[i]!);
    for (const step of steps) expect(step).toBeCloseTo(steps[0]!, 9);
    expect(interpolate(from, to, 0.5).width).toBeCloseTo(Math.sqrt(from.width * to.width), 6);
  });

  it("scales about a single fixed point", () => {
    // Every intermediate placement is the start scaled about the same point.
    const a = interpolate(from, to, 0.3);
    const b = interpolate(from, to, 0.7);
    const fixed = (p: Placement) => {
      const s = p.width / from.width;
      return { x: (p.x - s * from.x) / (1 - s), y: (p.y - s * from.y) / (1 - s) };
    };
    expect(fixed(a).x).toBeCloseTo(fixed(b).x, 6);
    expect(fixed(a).y).toBeCloseTo(fixed(b).y, 6);
  });
});

describe.each(VIEWS)("descent at $width×$height", (view) => {
  const segments = buildSegments(PLATES, view, GLOBE_SCALE);

  it("has one segment per plate transition, with weights summing to 1", () => {
    expect(segments).toHaveLength(PLATES.length - 1);
    expect(segments.reduce((sum, s) => sum + s.weight, 0)).toBeCloseTo(1, 9);
  });

  it("has no seams: each segment ends exactly where the next plate rests", () => {
    for (let i = 0; i < segments.length; i++) {
      const parent = PLATES[i]!;
      const end = segments[i]!.to;
      const rect = parent.childRect!;
      const child = { x: end.x + rect.x * end.width, y: end.y + rect.y * (end.width / parent.aspect), width: rect.w * end.width };
      expectPlacement(child, coverPlacement(PLATES[i + 1]!, view));
      if (i + 1 < segments.length) expectPlacement(segments[i + 1]!.from, coverPlacement(PLATES[i + 1]!, view));
    }
  });

  it("starts P1 on the screen centre at the globe's map scale", () => {
    const p1 = PLATES[0]!;
    const start = handoffPlacement(p1, view, GLOBE_SCALE);
    expect(start.x + p1.anchor!.x * start.width).toBeCloseTo(view.width / 2, 6);
    expect(start.y + p1.anchor!.y * (start.width / p1.aspect)).toBeCloseTo(view.height / 2, 6);
    expect(currentScale(p1, start, view)).toBeCloseTo(GLOBE_SCALE, 3);
    expectPlacement(segments[0]!.from, start);
  });

  it("zooms at one constant speed across the whole act", () => {
    // d(ln width)/dt is the same in every segment, because weights follow log zoom.
    const speeds = segments.map((s) => Math.log(s.to.width / s.from.width) / s.weight);
    for (const speed of speeds) expect(speed).toBeCloseTo(speeds[0]!, 6);
  });

  it("locates segments monotonically", () => {
    let last = -1;
    for (let t = 0; t <= 1; t += 0.01) {
      const { index, local } = locate(segments, t);
      expect(index).toBeGreaterThanOrEqual(last);
      expect(local).toBeGreaterThanOrEqual(0);
      expect(local).toBeLessThanOrEqual(1);
      last = index;
    }
  });
});

describe("plates", () => {
  it("child rectangles keep the plate's aspect ratio and sit inside it", () => {
    for (const plate of PLATES.slice(0, -1)) {
      const r = plate.childRect!;
      expect(r.w).toBeCloseTo(r.h, 9);
      expect(r.x + r.w).toBeLessThanOrEqual(1);
      expect(r.y + r.h).toBeLessThanOrEqual(1);
    }
    const parent = PLATES[0]!;
    const child = coverPlacement(PLATES[1]!, VIEWS[0]!);
    expect(parentPlacementFor(parent, child).width).toBeCloseTo(child.width / parent.childRect!.w, 6);
  });
});

describe("HUD readouts", () => {
  it("formats the scale to two significant figures", () => {
    expect(formatScale(250_000)).toBe("1 : 250,000");
    expect(formatScale(3_987_654)).toBe("1 : 4,000,000");
    expect(formatScale(47.3)).toBe("1 : 47");
  });

  it("picks a round scale-bar distance within the bar's range", () => {
    for (const denominator of [4_000_000, 250_000, 25_000, 2_500, 250, 50]) {
      const { label, px } = scaleBar(denominator);
      expect(px).toBeGreaterThanOrEqual(20);
      expect(px).toBeLessThanOrEqual(200);
      expect(label).toMatch(/^(1|10|100|1000)(\.0+)? ?(m|km)$|^\d+(\.\d+)? (m|km)$/);
    }
  });
});
