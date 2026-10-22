/**
 * The descent's camera path (issue #4, redesign #8, owner request 2026-10-20): from the
 * globe's handoff scale down to the owner's metro area, ringed; then an Apple-Maps-style
 * dive among the 3D buildings to a street address; then the camera rises to look straight
 * down, with a ring around the address at the Vitruvian circle's size. Becoming shrinks
 * that ring onto the circle: the world narrows to the person. Zoom moves linearly in t,
 * which is exponential in scale: a constant perceived speed (PRD Act 2).
 */
export type Camera = { zoom: number; pitch: number; bearing: number; center: LngLat };
export type LngLat = { lng: number; lat: number };
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
/** Radius of the ring around the street address that becomes the Vitruvian circle, in km. */
export const STREET_RADIUS_KM = 0.16;
/** At the end of the descent the ring is this much larger than the Vitruvian circle; Becoming shrinks it by the same. */
export const RING_OVERSIZE = 1.15;

/** The zoom at which a ring of `radiusKm` is `radiusPx` on screen at `lat`. */
export function zoomForRing(radiusPx: number, lat: number, radiusKm = AREA_RADIUS_KM): number {
  return zoomForScale((radiusKm * 1000) / (radiusPx * METRES_PER_CSS_PX), lat);
}

/** The street-level view: zoom, tilt, and the heading (east-north-east, across the Hudson to Midtown). */
export const STREET = { zoom: 16.3, pitch: 62, bearing: 64 } as const;

/**
 * The street-level tiles (public/assets/map/city.pmtiles) cover this box; the address
 * must be inside it. Keep in step with .github/workflows/build-map-tiles.yml.
 */
export const CITY_BOUNDS = { west: -74.05, south: 40.728, east: -73.975, north: 40.775 } as const;

/** Act progress marks: arrive over the metro area, dive to the street, hold, rise over the address. */
export const PHASES = { arrive: 0.26, dive: 0.36, street: 0.72, rise: 0.82 } as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How much the camera still drifts in while it holds over the metro area, in zoom levels. */
const METRO_DRIFT = 0.25;

/**
 * The camera at act progress `t`.
 * - `startZoom`: the globe's scale at the handoff.
 * - `metroZoom`: where the metro ring is the same size on screen as the final ring.
 * - `endZoom`: the address's ring at RING_OVERSIZE × the Vitruvian circle.
 * Without a `street`, the descent ends on the metro ring, flat and north-up.
 */
export function cameraAt(t: number, path: { startZoom: number; metroZoom: number; endZoom: number; area: LngLat; street: LngLat | null }): Camera {
  const { startZoom, metroZoom, area, street } = path;
  const { arrive, dive, street: atStreet, rise } = PHASES;
  if (!street) {
    const zoom = t < arrive ? lerp(startZoom, metroZoom - METRO_DRIFT, t / arrive) : lerp(metroZoom - METRO_DRIFT, metroZoom, (t - arrive) / (1 - arrive));
    return { zoom, pitch: 0, bearing: 0, center: area };
  }
  let zoom: number;
  if (t < arrive) zoom = lerp(startZoom, metroZoom - METRO_DRIFT, t / arrive);
  else if (t < dive) zoom = lerp(metroZoom - METRO_DRIFT, metroZoom, (t - arrive) / (dive - arrive));
  // The dive eases out of the metro hold and into the street, like a map app's fly-to.
  else if (t < atStreet) zoom = lerp(metroZoom, STREET.zoom, smoothstep(dive, atStreet, t));
  else if (t < rise) zoom = lerp(STREET.zoom, STREET.zoom + 0.15, (t - atStreet) / (rise - atStreet));
  else zoom = lerp(STREET.zoom + 0.15, path.endZoom, smoothstep(rise, 1, t));
  // The address glides to the centre of the screen at a steady on-screen speed: the
  // geographic offset shrinks with the scale as well as with the dive's progress.
  const glide = t < dive ? 1 : 2 ** (metroZoom - zoom) * (1 - smoothstep(dive, atStreet, t));
  const center = { lng: street.lng + (area.lng - street.lng) * glide, lat: street.lat + (area.lat - street.lat) * glide };
  const tilt = smoothstep(dive + 0.12, atStreet, t) * (1 - smoothstep(rise, 0.97, t));
  return {
    zoom,
    pitch: STREET.pitch * tilt,
    // The heading turns on the way down and stays: a circle looks the same either way up.
    // "+ 0" turns -0 into 0 at the start of the path.
    bearing: STREET.bearing * smoothstep(dive + 0.08, rise, t) + 0,
    center,
  };
}

/** Opacity of the metro area's ring: it rises as the metro view arrives and fades as the dive begins. */
export function highlightAt(t: number, hasStreet = true): number {
  const rising = smoothstep(0.12, PHASES.arrive, t);
  return hasStreet ? rising * (1 - smoothstep(PHASES.dive, PHASES.dive + 0.1, t)) : rising;
}

/** Opacity of the address's building in red chalk: it lights as the camera tilts in, and stays. */
export function buildingAt(t: number): number {
  return smoothstep(PHASES.dive + 0.16, PHASES.street, t);
}

/** Opacity of the address's ring: it draws in as the camera rises to look straight down. */
export function streetRingAt(t: number): number {
  return smoothstep(PHASES.rise + 0.04, 0.96, t);
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
