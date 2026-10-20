import { describe, expect, it } from "vitest";
import {
  AREA_RADIUS_KM,
  cameraAt,
  circlePolygon,
  formatScale,
  highlightAt,
  PHASES,
  scaleBar,
  scaleForZoom,
  zoomForRing,
  zoomForScale,
} from "../../src/acts/Descent/camera";

const START = 5.8;
const END = 9.8;

describe("map camera", () => {
  it("converts between map scale and zoom both ways", () => {
    for (const scale of [4_000_000, 250_000, 5_000]) {
      expect(scaleForZoom(zoomForScale(scale, 40.71), 40.71)).toBeCloseTo(scale, 3);
    }
  });

  it("frames the area's ring at the requested size on screen", () => {
    const radiusPx = 380;
    const metresPerPx = scaleForZoom(zoomForRing(radiusPx, 40.71), 40.71) * (0.0254 / 96);
    expect((AREA_RADIUS_KM * 1000) / metresPerPx).toBeCloseTo(radiusPx, 6);
  });

  it("starts at the globe's handoff zoom and ends flat, north-up, at the ring's zoom", () => {
    expect(cameraAt(0, START, END)).toMatchObject({ zoom: START, pitch: 0, bearing: 0 });
    expect(cameraAt(1, START, END)).toMatchObject({ zoom: END, pitch: 0, bearing: 0 });
  });

  it("only ever zooms in, at a constant rate while it travels", () => {
    let last = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const { zoom } = cameraAt(t, START, END);
      expect(zoom).toBeGreaterThanOrEqual(last);
      last = zoom;
    }
    const a = cameraAt(0.1, START, END).zoom - cameraAt(0.05, START, END).zoom;
    const b = cameraAt(0.3, START, END).zoom - cameraAt(0.25, START, END).zoom;
    expect(a).toBeCloseTo(b, 9);
  });

  it("highlights the area as the metro view arrives, and holds it for Becoming", () => {
    expect(highlightAt(0)).toBe(0);
    expect(highlightAt(PHASES.arrive)).toBeCloseTo(1, 5);
    expect(highlightAt(1)).toBe(1);
  });

  it("draws the highlight as a closed ring of the requested radius", () => {
    const ring = circlePolygon(-74.01, 40.71, 32);
    expect(ring[0]).toEqual(ring.at(-1));
    const [lng] = ring[0]!;
    const km = (lng - -74.01) * 111.32 * Math.cos((40.71 * Math.PI) / 180);
    expect(km).toBeCloseTo(32, 3);
  });

  it("formats the scale readout", () => {
    expect(formatScale(3_987_654)).toBe("1 : 4,000,000");
    const { label, px } = scaleBar(250_000);
    expect(label).toMatch(/km|m/);
    expect(px).toBeGreaterThan(19);
    expect(px).toBeLessThanOrEqual(200);
  });
});
