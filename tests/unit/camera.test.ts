import { describe, expect, it } from "vitest";
// The descent's camera now feeds only the pixel bake (scripts/bake-pixel.ts), which still frames the map with it.
import {
  AREA_RADIUS_KM,
  cameraAt,
  circlePolygon,
  formatScale,
  highlightAt,
  PHASES,
  scaleBar,
  scaleForZoom,
  STREET,
  STREET_RADIUS_KM,
  streetRingAt,
  CITY_BOUNDS,
  zoomForRing,
  zoomForScale,
} from "../../scripts/bake/camera";
import { content } from "../../src/content";

const START = 5.8;
const METRO = 9.8;
const AREA = { lat: 40.71, lng: -74.01 };
const HOME = { lat: 40.747, lng: -74.0321 };
const END = zoomForRing(380, HOME.lat, STREET_RADIUS_KM);
const flat = { startZoom: START, metroZoom: METRO, endZoom: METRO, area: AREA, street: null };
const dive = { startZoom: START, metroZoom: METRO, endZoom: END, area: AREA, street: HOME };

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

  it("without a street, starts at the globe's handoff zoom and ends flat, north-up, on the metro ring", () => {
    expect(cameraAt(0, flat)).toMatchObject({ zoom: START, pitch: 0, bearing: 0, center: AREA });
    expect(cameraAt(1, flat)).toMatchObject({ zoom: METRO, pitch: 0, bearing: 0, center: AREA });
    expect(highlightAt(1, false)).toBe(1);
  });

  it("zooms in at a constant rate from the globe to the metro view", () => {
    const a = cameraAt(0.1, dive).zoom - cameraAt(0.05, dive).zoom;
    const b = cameraAt(0.2, dive).zoom - cameraAt(0.15, dive).zoom;
    expect(a).toBeCloseTo(b, 9);
  });

  it("dives to street level, tilted among the buildings, centred on the address", () => {
    const low = cameraAt((PHASES.street + PHASES.rise) / 2, dive);
    expect(low.zoom).toBeGreaterThan(STREET.zoom - 0.01);
    expect(low.pitch).toBeCloseTo(STREET.pitch, 0);
    expect(low.center.lat).toBeCloseTo(HOME.lat, 9);
    expect(low.center.lng).toBeCloseTo(HOME.lng, 9);
  });

  it("only zooms in until it reaches the street, and moves smoothly", () => {
    let last = cameraAt(0, dive);
    for (let t = 0.005; t <= PHASES.rise; t += 0.005) {
      const next = cameraAt(t, dive);
      expect(next.zoom).toBeGreaterThanOrEqual(last.zoom - 1e-9);
      expect(Math.abs(next.pitch - last.pitch)).toBeLessThan(3);
      expect(Math.abs(next.bearing - last.bearing)).toBeLessThan(3);
      last = next;
    }
  });

  it("ends looking straight down on the address's ring, for Becoming to take over", () => {
    const end = cameraAt(1, dive);
    expect(end.zoom).toBeCloseTo(END, 6);
    expect(end.pitch).toBe(0);
    expect(end.center).toEqual(HOME);
    expect(streetRingAt(1)).toBe(1);
    expect(streetRingAt(PHASES.street)).toBe(0);
  });

  it("rings the metro area as it arrives and lets it go as the dive begins", () => {
    expect(highlightAt(0)).toBe(0);
    expect(highlightAt(PHASES.arrive)).toBeCloseTo(1, 5);
    expect(highlightAt(PHASES.street)).toBe(0);
  });

  it("has street-level tiles under the address in the content", () => {
    const street = content.owner.area?.street;
    if (!street) return;
    expect(street.lat).toBeGreaterThan(CITY_BOUNDS.south + 0.005);
    expect(street.lat).toBeLessThan(CITY_BOUNDS.north - 0.005);
    expect(street.lng).toBeGreaterThan(CITY_BOUNDS.west + 0.005);
    expect(street.lng).toBeLessThan(CITY_BOUNDS.east - 0.005);
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
