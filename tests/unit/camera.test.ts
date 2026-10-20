import { describe, expect, it } from "vitest";
import {
  cameraAt,
  circlePolygon,
  formatScale,
  highlightAt,
  MAX_PITCH,
  METRO_ZOOM,
  PHASES,
  scaleBar,
  scaleForZoom,
  STREET_ZOOM,
  zoomForScale,
} from "../../src/acts/Descent/camera";

describe("map camera", () => {
  it("converts between map scale and zoom both ways", () => {
    for (const scale of [4_000_000, 250_000, 5_000]) {
      expect(scaleForZoom(zoomForScale(scale, 40.71), 40.71)).toBeCloseTo(scale, 3);
    }
  });

  it("starts at the globe's handoff zoom and ends among the buildings, pitched", () => {
    const start = 5.8;
    expect(cameraAt(0, start)).toMatchObject({ zoom: start, pitch: 0, bearing: 0 });
    const end = cameraAt(1, start);
    expect(end.zoom).toBeCloseTo(STREET_ZOOM, 6);
    expect(end.pitch).toBeCloseTo(MAX_PITCH, 6);
  });

  it("only ever zooms in, at a constant rate within each phase", () => {
    let last = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const { zoom } = cameraAt(t, 5.8);
      expect(zoom).toBeGreaterThanOrEqual(last);
      last = zoom;
    }
    const a = cameraAt(0.1, 5.8).zoom - cameraAt(0.05, 5.8).zoom;
    const b = cameraAt(0.3, 5.8).zoom - cameraAt(0.25, 5.8).zoom;
    expect(a).toBeCloseTo(b, 9);
    expect(cameraAt(PHASES.arrive, 5.8).zoom).toBeCloseTo(METRO_ZOOM, 9);
  });

  it("highlights the area at metro scale and clears it before the streets", () => {
    expect(highlightAt(0)).toBe(0);
    expect(highlightAt((PHASES.arrive + PHASES.dwell) / 2)).toBeCloseTo(1, 5);
    expect(highlightAt(0.9)).toBe(0);
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
