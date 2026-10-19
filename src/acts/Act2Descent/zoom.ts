import type { Plate } from "./plates";

/**
 * Zoom maths for the descent (PRD Act 2). A plate's on-screen placement is a similarity
 * transform: the screen position of its top-left corner and its displayed width.
 */
export type Placement = { x: number; y: number; width: number };
export type Viewport = { width: number; height: number };

/** The plate scaled to cover the viewport, centred: its resting placement. */
export function coverPlacement(plate: Plate, view: Viewport): Placement {
  const width = Math.max(view.width, view.height * plate.aspect);
  const height = width / plate.aspect;
  return { x: (view.width - width) / 2, y: (view.height - height) / 2, width };
}

/** Placement of a parent plate such that its child, at `child`, sits in its childRect. */
export function parentPlacementFor(parent: Plate, child: Placement): Placement {
  const rect = parent.childRect!;
  const width = child.width / rect.w;
  const height = width / parent.aspect;
  return { x: child.x - rect.x * width, y: child.y - rect.y * height, width };
}

/**
 * Exponential interpolation between two placements. The scale follows
 * exp(lerp(ln s0, ln s1, t)), so perceived zoom speed is constant, and the path
 * scales about the fixed point of the move, so both ends are hit exactly.
 */
export function interpolate(from: Placement, to: Placement, t: number): Placement {
  const ratio = to.width / from.width;
  if (Math.abs(ratio - 1) < 1e-9) {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, width: from.width };
  }
  const width = Math.exp(Math.log(from.width) + (Math.log(to.width) - Math.log(from.width)) * t);
  const fx = (to.x - ratio * from.x) / (1 - ratio);
  const fy = (to.y - ratio * from.y) / (1 - ratio);
  const s = width / from.width;
  return { x: fx + (from.x - fx) * s, y: fy + (from.y - fy) * s, width };
}

/** Physical size of one CSS pixel at 96 dpi, in metres. */
export const METRES_PER_CSS_PX = 0.0254 / 96;

/** Placement of P1 at the globe handoff: its anchor on the screen centre, at the globe's map scale. */
export function handoffPlacement(p1: Plate, view: Viewport, globeScale: number): Placement {
  const rest = coverPlacement(p1, view);
  const width = rest.width * (p1.scale / globeScale);
  const anchor = p1.anchor!;
  return {
    x: view.width / 2 - anchor.x * width,
    y: view.height / 2 - anchor.y * (width / p1.aspect),
    width,
  };
}

export type Segment = { plate: number; from: Placement; to: Placement; weight: number };

/**
 * The zoom segments: segment i moves plate i from its start (handoff or resting cover)
 * to where plate i+1 rests. Each segment's share of the scroll is proportional to its
 * log zoom, so the whole descent zooms at one constant perceived speed.
 */
export function buildSegments(plates: Plate[], view: Viewport, globeScale: number): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < plates.length - 1; i++) {
    const plate = plates[i]!;
    const from = i === 0 ? handoffPlacement(plate, view, globeScale) : coverPlacement(plate, view);
    const to = parentPlacementFor(plate, coverPlacement(plates[i + 1]!, view));
    segments.push({ plate: i, from, to, weight: Math.abs(Math.log(to.width / from.width)) });
  }
  const total = segments.reduce((sum, s) => sum + s.weight, 0);
  for (const segment of segments) segment.weight /= total;
  return segments;
}

/** Which segment is active at act progress t, and how far through it. */
export function locate(segments: Segment[], t: number): { index: number; local: number } {
  let start = 0;
  for (let i = 0; i < segments.length; i++) {
    const end = start + segments[i]!.weight;
    if (t < end || i === segments.length - 1) {
      return { index: i, local: Math.min(1, Math.max(0, (t - start) / segments[i]!.weight)) };
    }
    start = end;
  }
  return { index: 0, local: 0 };
}

/** Scale denominator shown while a plate sits at `placement`. */
export function currentScale(plate: Plate, placement: Placement, view: Viewport): number {
  return plate.scale * (coverPlacement(plate, view).width / placement.width);
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
