import { describe, expect, it } from "vitest";
import { ACTS, ACT_RANGES, actAt, actIndex, parseHash, settleProgress } from "../../src/stage/acts";

describe("acts", () => {
  it("has acts whose ranges tile 0–1", () => {
    expect(ACTS.map((a) => a.id)).toEqual(["boot", "about", "globe", "descent", "squad", "becoming", "body", "outro"]);
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
    expect(parseHash("#squad/heart")).toEqual({ act: actIndex("squad"), region: null });
    expect(parseHash("#nope")).toBeNull();
    expect(parseHash("")).toBeNull();
  });
});
