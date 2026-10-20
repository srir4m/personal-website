import { describe, expect, it } from "vitest";
import { ACTS, ACT_RANGES, REST_POINTS, actAt, actIndex, parseHash, restPointAt, settleProgress } from "../../src/stage/acts";

describe("acts", () => {
  it("has acts whose ranges tile 0–1", () => {
    expect(ACTS.map((a) => a.id)).toEqual(["boot", "globe", "descent", "becoming", "tour", "body", "outro"]);
    expect(ACT_RANGES[0]!.start).toBe(0);
    expect(ACT_RANGES.at(-1)!.end).toBeCloseTo(1);
    ACT_RANGES.slice(1).forEach((range, i) => expect(range.start).toBe(ACT_RANGES[i]!.end));
  });

  it("maps every settle point back to its own act", () => {
    ACTS.forEach((_, i) => expect(actAt(Math.min(settleProgress(i), 0.9999))).toBe(i));
  });

  it("parses deep links", () => {
    expect(parseHash("#globe")).toEqual({ act: actIndex("globe"), region: null });
    expect(parseHash("#body/heart")).toEqual({ act: actIndex("body"), region: "heart" });
    expect(parseHash("#profile/heart")).toEqual({ act: actIndex("tour"), region: null });
    // Hashes from before the redesign land on the tour, which absorbed them.
    expect(parseHash("#about")).toEqual({ act: actIndex("tour"), region: null });
    expect(parseHash("#activities")).toEqual({ act: actIndex("tour"), region: null });
    expect(parseHash("#nope")).toBeNull();
    expect(parseHash("")).toBeNull();
  });

  it("gives every tour stop its own rest point, inside the tour, in order", () => {
    const tour = ACT_RANGES[actIndex("tour")]!;
    const stops = REST_POINTS.filter((p) => p.act === actIndex("tour"));
    expect(stops.length).toBeGreaterThan(5);
    stops.forEach((p, i) => {
      expect(p.at).toBeGreaterThan(tour.start);
      expect(p.at).toBeLessThan(tour.end);
      if (i) expect(p.at).toBeGreaterThan(stops[i - 1]!.at);
      // Calm mode snaps any point in a stop's segment to that stop.
      expect(restPointAt(p.at)).toBe(p.at);
      expect(restPointAt(p.from + 1e-6)).toBe(p.at);
    });
  });
});
