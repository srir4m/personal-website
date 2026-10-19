import { latLngToVector, type Vec3 } from "./geo";

/**
 * Orthographic SVG drawing of the globe, used where WebGL isn't: the Boot graticule and
 * the no-WebGL fallback. Coordinates are in a viewBox of -1..1 with the globe's circle at r = 1.
 */
const DEG = Math.PI / 180;

/** Rotates a globe point so (lat0, lng0) faces the viewer, matching `facingRotation`. */
function view([x, y, z]: Vec3, lat0: number, lng0: number): Vec3 {
  const cy = Math.cos(-lng0 * DEG);
  const sy = Math.sin(-lng0 * DEG);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cx = Math.cos(lat0 * DEG);
  const sx = Math.sin(lat0 * DEG);
  return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
}

/** Projects (lat, lng) to SVG coordinates, or null on the far side. */
export function project(lat: number, lng: number, lat0: number, lng0: number): [number, number] | null {
  const [x, y, z] = view(latLngToVector(lat, lng), lat0, lng0);
  return z < 0 ? null : [x, -y];
}

function pathThrough(points: [number, number][], lat0: number, lng0: number): string[] {
  const paths: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 1) paths.push(`M${current.join("L")}`);
    current = [];
  };
  for (const [lat, lng] of points) {
    const p = project(lat, lng, lat0, lng0);
    if (p) current.push(`${p[0].toFixed(4)},${p[1].toFixed(4)}`);
    else flush();
  }
  flush();
  return paths;
}

/** Visible meridians and parallels every `step` degrees, as SVG path data. */
export function graticulePaths(lat0: number, lng0: number, step = 15): string[] {
  const paths: string[] = [];
  for (let lng = -180; lng < 180; lng += step) {
    const line: [number, number][] = [];
    for (let lat = -90; lat <= 90; lat += 2) line.push([lat, lng]);
    paths.push(...pathThrough(line, lat0, lng0));
  }
  for (let lat = -90 + step; lat < 90; lat += step) {
    const line: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 2) line.push([lat, lng]);
    paths.push(...pathThrough(line, lat0, lng0));
  }
  return paths;
}
