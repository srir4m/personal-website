/**
 * A generic standing figure for the squad silhouettes, in units of the Vitruvian square
 * (0–1), so it lines up with whichever figure is in use. Anonymous by design (PRD Act 3).
 */
type Pt = [number, number];

function capsule(from: Pt, to: Pt, width: number, taper = 1): string {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const r1 = width / 2;
  const r2 = (width * taper) / 2;
  const f = (v: number) => v.toFixed(4);
  return `M${f(x1 + nx * r1)},${f(y1 + ny * r1)}L${f(x2 + nx * r2)},${f(y2 + ny * r2)}A${f(r2)},${f(r2)} 0 0 0 ${f(x2 - nx * r2)},${f(y2 - ny * r2)}L${f(x1 - nx * r1)},${f(y1 - ny * r1)}A${f(r1)},${f(r1)} 0 0 0 ${f(x1 + nx * r1)},${f(y1 + ny * r1)}Z`;
}

const head = "M0.4429,0.0686A0.0571,0.0686 0 1 0 0.5571,0.0686A0.0571,0.0686 0 1 0 0.4429,0.0686Z";

/** The silhouette path in square units; feet at y = 1, head top at y = 0. */
export const SILHOUETTE_PATH = [
  head,
  capsule([0.5, 0.125], [0.5, 0.165], 0.05),
  capsule([0.5, 0.185], [0.5, 0.36], 0.185, 0.8),
  capsule([0.5, 0.36], [0.5, 0.53], 0.145, 1.05),
  capsule([0.41, 0.2], [0.59, 0.2], 0.063),
  capsule([0.41, 0.2], [0.37, 0.56], 0.05, 0.6),
  capsule([0.59, 0.2], [0.63, 0.56], 0.05, 0.6),
  capsule([0.466, 0.53], [0.47, 0.97], 0.072, 0.5),
  capsule([0.534, 0.53], [0.53, 0.97], 0.072, 0.5),
].join("");
