import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import raw from "../../src/content/site-content.json";
import { facingRotation, formatCoordinates, latLngToVector, vectorToLatLng } from "../../src/acts/Act1Globe/geo";
import { groupByTerm } from "../../src/acts/Act1Globe/EducationCard";
import { cameraDistanceFor } from "../../src/acts/Act1Globe/layout";
import { project } from "../../src/acts/Act1Globe/ortho";
import { subsolarPoint } from "../../src/acts/Act1Globe/sun";
import type { Course } from "../../src/content/schema";

const { lat, lng } = raw.education.location;
const angleBetween = (a: Vector3, b: Vector3) => (a.angleTo(b) * 180) / Math.PI;

describe("globe geometry", () => {
  it("round-trips coordinates", () => {
    const back = vectorToLatLng(latLngToVector(lat, lng));
    expect(back.lat).toBeCloseTo(lat, 9);
    expect(back.lng).toBeCloseTo(lng, 9);
  });

  it("turns the marker to face the camera to within 0.1°", () => {
    const { x, y } = facingRotation(lat, lng);
    const marker = new Vector3(...latLngToVector(lat, lng)).applyEuler(new Euler(x, y, 0, "XYZ"));
    expect(angleBetween(marker, new Vector3(0, 0, 1))).toBeLessThan(0.1);
  });

  it("puts the marker at the centre of the orthographic fallback", () => {
    const [px, py] = project(lat, lng, lat, lng)!;
    expect(Math.hypot(px, py)).toBeLessThan(1e-9);
  });

  it("formats the coordinate readout", () => {
    expect(formatCoordinates(lat, lng)).toBe("40.745°N 74.024°W");
  });

  it("sizes the globe's circle to the requested pixel radius", () => {
    const height = 900;
    const distance = cameraDistanceFor(306, height);
    const alpha = Math.asin(1 / distance);
    const radiusPx = (height / 2) * (Math.tan(alpha) / Math.tan((15 * Math.PI) / 180));
    expect(radiusPx).toBeCloseTo(306, 6);
  });

  it("puts the sun over the tropic of Cancer at the June solstice", () => {
    const sun = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12)));
    expect(sun.lat).toBeGreaterThan(23);
    expect(Math.abs(sun.lng)).toBeLessThan(2);
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
