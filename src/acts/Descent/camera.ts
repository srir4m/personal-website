/**
 * The descent's camera path (issue #4, redesign #8): from the globe's handoff scale down
 * to the owner's area at metro scale, where the highlighted ring settles just outside the
 * Vitruvian circle's size. Becoming then shrinks that ring onto the circle: the world
 * narrows to the person. Zoom moves linearly in t, which is exponential in scale: a
 * constant perceived speed (PRD Act 2).
 */
export type Camera = { zoom: number; pitch: number; bearing: number };

const METRES_PER_CSS_PX = 0.0254 / 96;
/** Metres per pixel at zoom 0 at the equator, for MapLibre's 512 px tiles. */
const MERCATOR_MPP_Z0 = 78271.517;

/** The MapLibre zoom whose scale at `lat` is 1 : `denominator`. */
export function zoomForScale(denominator: number, lat: number): number {
  return Math.log2((MERCATOR_MPP_Z0 * Math.cos((lat * Math.PI) / 180)) / (denominator * METRES_PER_CSS_PX));
}

/** The map scale denominator at the centre of a MapLibre view at `zoom`. */
export function scaleForZoom(zoom: number, lat: number): number {
  return (MERCATOR_MPP_Z0 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom / METRES_PER_CSS_PX;
}

/** Radius of the highlighted metro area, in km. */
export const AREA_RADIUS_KM = 32;
/** At the end of the descent the ring is this much larger than the Vitruvian circle; Becoming shrinks it by the same. */
export const RING_OVERSIZE = 1.15;
/** How much the camera still drifts in while the ring holds, in zoom levels. */
const DWELL_ZOOM = 0.35;

/** The zoom at which a ring of AREA_RADIUS_KM is `radiusPx` on screen at `lat`. */
export function zoomForRing(radiusPx: number, lat: number): number {
  return zoomForScale((AREA_RADIUS_KM * 1000) / (radiusPx * METRES_PER_CSS_PX), lat);
}

/** Act progress marks: the metro view arrives, then holds until Becoming takes over. */
export const PHASES = { arrive: 0.55 } as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Zoom from `startZoom` (the globe's) to `endZoom` (the ring's size), flat and north-up. */
export function cameraAt(t: number, startZoom: number, endZoom: number): Camera {
  const metro = endZoom - DWELL_ZOOM;
  const zoom = t < PHASES.arrive ? lerp(startZoom, metro, t / PHASES.arrive) : lerp(metro, endZoom, (t - PHASES.arrive) / (1 - PHASES.arrive));
  return { zoom, pitch: 0, bearing: 0 };
}

/** Opacity of the area highlight: it rises as the metro view arrives, then holds for Becoming. */
export function highlightAt(t: number): number {
  return smoothstep(0.25, PHASES.arrive, t);
}

/** A polygon approximating a circle of `radiusKm` around a point, for the soft metro-area highlight. */
export function circlePolygon(lng: number, lat: number, radiusKm: number, steps = 96): [number, number][] {
  const latR = radiusKm / 110.574;
  const lngR = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([lng + Math.cos(a) * lngR, lat + Math.sin(a) * latR]);
  }
  return ring;
}

/** "1 : 250,000", rounded to two significant figures. */
export function formatScale(denominator: number): string {
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(denominator)) - 1);
  return `1 : ${(Math.round(denominator / magnitude) * magnitude).toLocaleString("en-US")}`;
}

/** A round ground distance for the scale bar, and its length in CSS px (between maxPx/10 and maxPx). */
export function scaleBar(denominator: number, maxPx = 200): { label: string; px: number } {
  const metresPerPx = denominator * METRES_PER_CSS_PX;
  const metres = 10 ** Math.floor(Math.log10(metresPerPx * maxPx));
  const label = metres >= 1000 ? `${metres / 1000} km` : `${metres} m`;
  return { label, px: metres / metresPerPx };
}
