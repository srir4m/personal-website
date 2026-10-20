/**
 * The descent's camera path (issue #4): from the globe's handoff scale, down to the
 * owner's area at metro scale (highlighted), then on down into 3D streets. Zoom moves
 * linearly in t, which is exponential in scale: a constant perceived speed (PRD Act 2).
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

/** Zoom at which the area is framed and highlighted. */
export const METRO_ZOOM = 9.4;
/** Zoom at the end of the descent, among the buildings. */
export const STREET_ZOOM = 15.3;
export const MAX_PITCH = 60;
export const END_BEARING = -24;

/** Act progress marks for each phase of the path. */
export const PHASES = { arrive: 0.38, dwell: 0.5, tilt: 0.62 } as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function cameraAt(t: number, startZoom: number): Camera {
  const { arrive, dwell, tilt } = PHASES;
  let zoom: number;
  if (t < arrive) zoom = lerp(startZoom, METRO_ZOOM, t / arrive);
  else if (t < dwell) zoom = lerp(METRO_ZOOM, METRO_ZOOM + 0.5, (t - arrive) / (dwell - arrive));
  else zoom = lerp(METRO_ZOOM + 0.5, STREET_ZOOM, (t - dwell) / (1 - dwell));
  return {
    zoom,
    pitch: MAX_PITCH * smoothstep(tilt, 0.95, t),
    // "+ 0" turns -0 into 0 at the start of the path.
    bearing: END_BEARING * smoothstep(tilt - 0.02, 1, t) + 0,
  };
}

/** Opacity of the area highlight: it rises as the metro view arrives and fades as the camera tilts down. */
export function highlightAt(t: number): number {
  return smoothstep(0.2, PHASES.arrive - 0.04, t) * (1 - smoothstep(PHASES.dwell + 0.04, PHASES.tilt + 0.04, t));
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
