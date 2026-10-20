/**
 * The fig leaf over the figure's groin (owner request, 2026-10-20): the classical way to
 * censor a nude, drawn as an engraving in the figure's ink. Built from lobes in polar
 * form and smoothed with Catmull-Rom curves, in the figure's viewBox units.
 */

type Pt = [number, number];

/**
 * The extent of the genitals' ink in the drawing (viewBox units), measured on the scan:
 * the leaf must cover all of it. The figure's image is erased under the leaf.
 */
export const GROIN: [number, number][] = [
  [752, 864], [800, 856], [848, 864], [850, 900], [830, 945], [826, 958], [800, 962], [774, 958], [768, 945], [750, 900],
];

/** Where the leaf hangs from (its stalk's base) and its length, in viewBox units. */
export const FIG_LEAF = { x: 800, y: 845, size: 122 } as const;

/** Lobes: angle from straight down (degrees), length (× size), half-width at the tip (degrees). */
const LOBES = [
  { angle: -114, length: 0.5, width: 15 },
  { angle: -56, length: 0.9, width: 13 },
  { angle: 0, length: 1.06, width: 21 },
  { angle: 56, length: 0.9, width: 13 },
  { angle: 114, length: 0.5, width: 15 },
];
/** Depth of the sinus after each lobe (× size): shallow between the big lobes, so the leaf covers. */
const SINUSES = [0.42, 0.86, 0.86, 0.42];

/** A small, repeatable waver along the margin, so the outline reads as drawn, not plotted. */
const waver = (i: number) => Math.sin(i * 12.9898) * 0.018;

const polar = (angle: number, r: number): Pt => {
  const a = (angle * Math.PI) / 180;
  return [Math.sin(a) * r, Math.cos(a) * r];
};

/** The outline as points, from the stalk round the lobes and back. */
function outline(): Pt[] {
  // A heart-shaped notch where the stalk joins.
  const pts: Pt[] = [polar(-150, 0.1), polar(-140, 0.2)];
  LOBES.forEach((lobe, i) => {
    const prev = i ? SINUSES[i - 1]! : 0.2;
    const next = SINUSES[i] ?? 0.2;
    // Up each flank to a rounded tip and back down, with the margin wavering.
    pts.push(polar(lobe.angle - lobe.width * 1.6, (prev + lobe.length) / 2 + waver(i * 5)));
    pts.push(polar(lobe.angle - lobe.width, lobe.length * 0.92 + waver(i * 5 + 1)));
    pts.push(polar(lobe.angle, lobe.length));
    pts.push(polar(lobe.angle + lobe.width, lobe.length * 0.92 + waver(i * 5 + 2)));
    pts.push(polar(lobe.angle + lobe.width * 1.6, (next + lobe.length) / 2 + waver(i * 5 + 3)));
    const after = LOBES[i + 1];
    if (after) pts.push(polar((lobe.angle + after.angle) / 2, next));
  });
  pts.push(polar(140, 0.2), polar(150, 0.1), [0, 0.03]);
  return pts;
}

/** A closed Catmull-Rom spline through the points, as cubic Béziers. */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n]!;
  let d = `M${at(0).map(f).join(" ")}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${[...c1, ...c2, ...p2].map(f).join(" ")}`;
  }
  return `${d}Z`;
}

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();

/** The smoothed outline sampled as a polygon, for clipping the inner lines to it. */
function sampled(pts: Pt[], steps = 10): Pt[] {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n]!;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, c_: number, d: number) =>
        0.5 * (2 * b + (-a + c_) * t + (2 * a - 5 * b + 4 * c_ - d) * t2 + (-a + 3 * b - 3 * c_ + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

const inside = ([x, y]: Pt, poly: Pt[]) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

/** The parts of segment a→b inside the polygon, as path data. No clipPath, so no ids to collide. */
function clipped(a: Pt, b: Pt, poly: Pt[]): string {
  const ts = [0, 1];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [p, q] = [poly[j]!, poly[i]!];
    const [rx, ry, sx, sy] = [b[0] - a[0], b[1] - a[1], q[0] - p[0], q[1] - p[1]];
    const den = rx * sy - ry * sx;
    if (!den) continue;
    const t = ((p[0] - a[0]) * sy - (p[1] - a[1]) * sx) / den;
    const u = ((p[0] - a[0]) * ry - (p[1] - a[1]) * rx) / den;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const point = (t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  let d = "";
  for (let i = 1; i < ts.length; i++) {
    if (ts[i]! - ts[i - 1]! < 1e-6 || !inside(point((ts[i]! + ts[i - 1]!) / 2), poly)) continue;
    const [p, q] = [point(ts[i - 1]!), point(ts[i]!)];
    d += `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`;
  }
  return d;
}

/** A lobe's midrib from the stalk to near its tip, with two pairs of side veins. */
function vein(lobe: (typeof LOBES)[number], poly: Pt[]): string {
  const tip = polar(lobe.angle, lobe.length * 0.86);
  let d = clipped([0, 0.02], tip, poly);
  for (const t of [0.34, 0.58]) {
    const base = polar(lobe.angle, lobe.length * t);
    for (const side of [-1, 1]) d += clipped(base, polar(lobe.angle + side * 22, lobe.length * (t + 0.22)), poly);
  }
  return d;
}

/** Engraver's hatching, down to the right, over the leaf's right half. */
function hatching(poly: Pt[]): string {
  let d = "";
  for (let k = -0.1; k < 1.3; k += 0.042) d += clipped([k, -0.2], [k + 0.5, 1.1], poly);
  return d;
}

/** Is the point (viewBox units) inside the polygon? */
export function insidePolygon(point: Pt, poly: Pt[]): boolean {
  return inside(point, poly);
}

/** The leaf's outline in viewBox units, as a polygon. */
export function leafPolygon(): Pt[] {
  const { x, y, size } = FIG_LEAF;
  return sampled(outline()).map(([px, py]) => [x + px * size, y + py * size]);
}

/** The leaf's SVG markup, placed on the figure. `fill` paints the leaf's body (parchment). */
export function figLeafMarkup(fill = "var(--parchment, #efe4cc)"): string {
  const { x, y, size } = FIG_LEAF;
  const pts = outline();
  const leaf = smoothClosed(pts);
  const poly = sampled(pts);
  // Stroke widths are in leaf units (1 = size), so divide the viewBox widths by size.
  const w = (px: number) => f(px / size);
  return `<g class="fig-leaf" transform="translate(${x} ${y}) scale(${size})" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <path d="${leaf}" fill="${fill}" stroke="none"/>
  <path d="${hatching(poly)}" stroke-width="${w(0.7)}" opacity="0.5"/>
  <path d="${LOBES.map((lobe) => vein(lobe, poly)).join("")}" stroke-width="${w(1)}"/>
  <path d="${leaf}" stroke-width="${w(2)}"/>
  <path d="M0 0.03C-0.015 -0.04 0.005 -0.09 0.04 -0.13" stroke-width="${w(2)}"/>
</g>`;
}
