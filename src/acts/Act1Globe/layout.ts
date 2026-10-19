/**
 * The globe's resting size: its circle's radius as a fraction of min(viewport width,
 * height). Act 0's graticule uses the same circle, and Act 4's Vitruvian circle will too.
 */
export const GLOBE_RADIUS_VMIN = 0.34;

/** Vertical field of view of the globe camera, in degrees. */
export const GLOBE_FOV = 30;

/** Camera distance (in globe radii) at which the globe's circle has `radiusPx` on screen. */
export function cameraDistanceFor(radiusPx: number, viewportHeight: number, fov = GLOBE_FOV): number {
  const tanAlpha = (radiusPx / (viewportHeight / 2)) * Math.tan(((fov / 2) * Math.PI) / 180);
  return Math.sqrt(1 + 1 / (tanAlpha * tanAlpha));
}

/** How close the camera dollies in by the end of Act 1, in globe radii from the centre. */
export const DOLLY_DISTANCE = 1.28;

/** The globe's idle pose before the scroll takes over: a tilt toward the viewer, and a start angle. */
export const IDLE_TILT_DEG = 21.8;
export const IDLE_START_LNG = 68.75;

/** Earth's mean radius, in metres. */
export const EARTH_RADIUS_M = 6_371_000;

/**
 * Map scale denominator at the screen centre once the globe has dollied in: the scale
 * P1 must match for a seamless handoff (PRD Act 2).
 */
export function globeScaleAtDolly(viewportHeight: number, fov = GLOBE_FOV): number {
  const metresPerPx =
    (EARTH_RADIUS_M * (DOLLY_DISTANCE - 1) * Math.tan(((fov / 2) * Math.PI) / 180)) / (viewportHeight / 2);
  return metresPerPx / (0.0254 / 96);
}
