/**
 * Globe coordinate convention, shared by the data script, the shaders and the HUD:
 * a unit sphere with +Y through the north pole and longitude 0 facing +Z (the camera).
 * Longitude increases eastward, toward +X.
 */
export type Vec3 = [number, number, number];

const DEG = Math.PI / 180;

export function latLngToVector(lat: number, lng: number, radius = 1): Vec3 {
  const phi = lat * DEG;
  const lambda = lng * DEG;
  return [radius * Math.cos(phi) * Math.sin(lambda), radius * Math.sin(phi), radius * Math.cos(phi) * Math.cos(lambda)];
}

export function vectorToLatLng([x, y, z]: Vec3): { lat: number; lng: number } {
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(y / r) / DEG, lng: Math.atan2(x, z) / DEG };
}

/**
 * Globe rotation (Euler order "XYZ": the Y turn applies first, then the X tilt) that
 * brings a point to face the camera on +Z.
 */
export function facingRotation(lat: number, lng: number): { x: number; y: number } {
  return { x: lat * DEG, y: -lng * DEG };
}

/** "40.745°N 74.024°W" */
export function formatCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns} ${Math.abs(lng).toFixed(3)}°${ew}`;
}
