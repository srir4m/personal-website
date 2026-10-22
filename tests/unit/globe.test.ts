import { describe, expect, it } from "vitest";
import raw from "../../src/content/site-content.json";
import { formatCoordinates, latLngToVector, vectorToLatLng } from "../../scripts/geo";
import { groupByTerm } from "../../src/components/CourseLog";
import type { Course } from "../../src/content/schema";

const { lat, lng } = raw.education.location;

// The globe-data script's geometry (npm run globe:data builds the land mask the pixel globe reads).
describe("globe geometry", () => {
  it("round-trips coordinates", () => {
    const back = vectorToLatLng(latLngToVector(lat, lng));
    expect(back.lat).toBeCloseTo(lat, 9);
    expect(back.lng).toBeCloseTo(lng, 9);
  });

  it("formats the coordinate readout", () => {
    expect(formatCoordinates(lat, lng)).toBe("40.745°N 74.024°W");
  });
});

describe("course log", () => {
  it("groups courses by term, newest first", () => {
    const terms = groupByTerm(raw.education.courses as Course[]);
    expect(terms[0]!.term).toBe("2026 Fall");
    expect(terms.at(-1)!.term).toBe("2024 Fall");
    const orders = terms.map((t) => t.courses[0]!.termOrder);
    expect([...orders].sort((a, b) => b - a)).toEqual(orders);
  });
});
