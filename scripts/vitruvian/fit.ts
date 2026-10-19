/**
 * Image analysis for the Vitruvian tracing pipeline (PRD §8.2): threshold a scan into an
 * ink mask, find the drawing's square and circle, and erase them so potrace only traces
 * the figure. The clean geometry is then redrawn as real <rect> and <circle> elements.
 */
export type Mask = { width: number; height: number; data: Uint8Array };
export type Circle = { cx: number; cy: number; r: number };
export type Square = { x: number; y: number; size: number };
/** The four edges as actually drawn: hand-drawn squares are rarely exact. */
export type Edges = { left: number; right: number; top: number; bottom: number };

/** Grey values (0–255) → contrast-stretched between the 2nd and 98th percentiles. */
export function contrastStretch(grey: Uint8Array): Uint8Array {
  const histogram = new Uint32Array(256);
  for (const v of grey) histogram[v]!++;
  const percentile = (p: number) => {
    let count = 0;
    for (let v = 0; v < 256; v++) {
      count += histogram[v]!;
      if (count >= grey.length * p) return v;
    }
    return 255;
  };
  const lo = percentile(0.02);
  const hi = Math.max(lo + 1, percentile(0.98));
  return grey.map((v) => Math.min(255, Math.max(0, Math.round(((v - lo) / (hi - lo)) * 255))));
}

/** Otsu's threshold: the grey level that best separates ink from paper. */
export function otsu(grey: Uint8Array): number {
  const histogram = new Float64Array(256);
  for (const v of grey) histogram[v]!++;
  const total = grey.length;
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * histogram[v]!;
  let sumB = 0;
  let weightB = 0;
  let best = 0;
  let threshold = 127;
  for (let v = 0; v < 256; v++) {
    weightB += histogram[v]!;
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += v * histogram[v]!;
    const between = weightB * weightF * (sumB / weightB - (sum - sumB) / weightF) ** 2;
    if (between > best) {
      best = between;
      threshold = v;
    }
  }
  return threshold;
}

/** 1 where the pixel is ink: at or below the threshold (Otsu puts that level in the dark class). */
export function toMask(grey: Uint8Array, width: number, height: number, threshold: number): Mask {
  return { width, height, data: grey.map((v) => (v <= threshold ? 1 : 0)) };
}

/** Finds the two strongest lines along one axis, at least `minGap` apart. */
function strongestPair(counts: Float64Array, minGap: number): [number, number] {
  const order = [...counts.keys()].sort((a, b) => counts[b]! - counts[a]!);
  const first = order[0]!;
  const second = order.find((i) => Math.abs(i - first) >= minGap) ?? first;
  return first < second ? [first, second] : [second, first];
}

/** The square's edges are the longest straight ink runs: peaks in row and column ink counts. */
export function fitSquare(mask: Mask): Square {
  return squareFromEdges(fitEdges(mask));
}

export function squareFromEdges({ left, right, top, bottom }: Edges): Square {
  const size = (bottom - top + (right - left)) / 2;
  return { x: (left + right) / 2 - size / 2, y: (top + bottom) / 2 - size / 2, size };
}

export function fitEdges(mask: Mask): Edges {
  const { width, height, data } = mask;
  const rows = new Float64Array(height);
  const cols = new Float64Array(width);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[y * width + x]) {
        rows[y]!++;
        cols[x]!++;
      }
  const [top, bottom] = strongestPair(rows, height * 0.4);
  const [left, right] = strongestPair(cols, width * 0.4);
  return { left, right, top, bottom };
}

/** How many of 720 points around the circle land on ink. */
function circleScore(mask: Mask, c: Circle): number {
  let hits = 0;
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    const x = Math.round(c.cx + Math.cos(a) * c.r);
    const y = Math.round(c.cy + Math.sin(a) * c.r);
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) continue;
    let ink = false;
    for (let dy = -1; dy <= 1 && !ink; dy++)
      for (let dx = -1; dx <= 1 && !ink; dx++) ink = mask.data[(y + dy) * mask.width + (x + dx)] === 1;
    if (ink) hits++;
  }
  return hits;
}

/**
 * RANSAC circle fit, constrained to Leonardo's layout: the centre sits on the square's
 * vertical axis and the radius is 0.45–0.75 of the square's side. A deterministic RNG
 * keeps the output stable between runs.
 */
export function fitCircle(mask: Mask, square: Square, iterations = 4000): Circle {
  const ink: number[] = [];
  for (let i = 0; i < mask.data.length; i++) if (mask.data[i]) ink.push(i);
  let seed = 12345;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const axis = square.x + square.size / 2;
  let best: Circle = { cx: axis, cy: square.y + square.size * 0.4, r: square.size * 0.6 };
  let bestScore = -1;
  for (let i = 0; i < iterations && ink.length > 2; i++) {
    const pick = () => {
      const index = ink[Math.floor(random() * ink.length)]!;
      return [index % mask.width, Math.floor(index / mask.width)] as const;
    };
    const [x1, y1] = pick();
    const [x2, y2] = pick();
    // With the centre fixed on the axis, two points determine the circle.
    if (Math.abs(y1 - y2) < 4) continue;
    const cy = ((x1 - axis) ** 2 - (x2 - axis) ** 2 + y1 * y1 - y2 * y2) / (2 * (y1 - y2));
    const r = Math.hypot(x1 - axis, y1 - cy);
    if (r < square.size * 0.45 || r > square.size * 0.75) continue;
    const candidate = { cx: axis, cy, r };
    const score = circleScore(mask, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  // Refine: small search around the best candidate.
  for (const dr of [-2, -1, 0, 1, 2])
    for (const dy of [-2, -1, 0, 1, 2])
      for (const dx of [-2, -1, 0, 1, 2]) {
        const candidate = { cx: best.cx + dx, cy: best.cy + dy, r: best.r + dr };
        const score = circleScore(mask, candidate);
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
  return best;
}

/** Clears ink within `band` px of the circle's and square's outlines (`edges` when known, else the square). */
export function eraseShapes(mask: Mask, circle: Circle, square: Square, band: number, edges?: Edges): Mask {
  const data = mask.data.slice();
  const { width, height } = mask;
  const e = edges ?? { left: square.x, top: square.y, right: square.x + square.size, bottom: square.y + square.size };
  const right = e.right;
  const bottom = e.bottom;
  square = { ...square, x: e.left, y: e.top };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!data[i]) continue;
      const nearCircle = Math.abs(Math.hypot(x - circle.cx, y - circle.cy) - circle.r) <= band;
      const withinX = x >= square.x - band && x <= right + band;
      const withinY = y >= square.y - band && y <= bottom + band;
      const nearSquare =
        (withinX && (Math.abs(y - square.y) <= band || Math.abs(y - bottom) <= band)) ||
        (withinY && (Math.abs(x - square.x) <= band || Math.abs(x - right) <= band));
      if (nearCircle || nearSquare) data[i] = 0;
    }
  return { width, height, data };
}

/**
 * Evens out paper tone (stains, vignetting, uneven light) by dividing each pixel by a
 * heavy box blur of its surroundings, so one global threshold works across the sheet.
 */
export function flattenBackground(grey: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  // Integral image for O(1) box sums.
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += grey[y * width + x]!;
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1]! + row;
    }
  }
  const out = new Uint8Array(grey.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width, x + radius + 1);
      const sum =
        integral[y1 * (width + 1) + x1]! - integral[y0 * (width + 1) + x1]! - integral[y1 * (width + 1) + x0]! + integral[y0 * (width + 1) + x0]!;
      const background = sum / ((x1 - x0) * (y1 - y0));
      out[y * width + x] = Math.min(255, Math.round((grey[y * width + x]! / Math.max(1, background)) * 230));
    }
  }
  return out;
}

/**
 * Clears ink outside the union of the circle and square (plus `margin`): the text and
 * stains around the drawing. Nothing of the figure rises above the square's top (the
 * raised hands reach it), so the cap of the circle above it, where Leonardo's notes
 * overlap the drawing, is cleared too.
 */
export function clipToShapes(mask: Mask, circle: Circle, square: Square, margin: number): Mask {
  const data = mask.data.slice();
  const ceiling = square.y - square.size * 0.03;
  for (let y = 0; y < mask.height; y++)
    for (let x = 0; x < mask.width; x++) {
      if (y < ceiling) {
        data[y * mask.width + x] = 0;
        continue;
      }
      const inCircle = Math.hypot(x - circle.cx, y - circle.cy) <= circle.r + margin;
      const inSquare =
        x >= square.x - margin && x <= square.x + square.size + margin && y >= square.y - margin && y <= square.y + square.size + margin;
      if (!inCircle && !inSquare) data[y * mask.width + x] = 0;
    }
  return { width: mask.width, height: mask.height, data };
}

type Probe = { x: number; y: number; nx: number; ny: number };

/**
 * Erases a hand-drawn stroke that wobbles around an ideal curve. Walking along `probe(t)`,
 * it scans a window across the curve (along its normal), picks the thin ink run nearest
 * to where the stroke was last seen, erases it, and follows it. Runs longer than `maxRun`
 * are left alone, so a hand or foot that touches the line keeps its tip.
 */
export function eraseTrackedStroke(
  mask: Mask,
  probe: (t: number) => Probe,
  {
    steps,
    window,
    maxRun,
    maxJump = window / 2,
    pad = 1,
  }: { steps: number; window: number; maxRun: number; maxJump?: number; pad?: number },
): Mask {
  const data = mask.data.slice();
  const at = (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < mask.width && yi < mask.height ? yi * mask.width + xi : -1;
  };
  let offset = 0;
  for (let s = 0; s <= steps; s++) {
    const { x, y, nx, ny } = probe(s / steps);
    // Collect ink runs along the normal within the fixed window around the ideal curve.
    // The window never moves, so the tracker cannot wander off into the figure.
    const runs: { start: number; end: number }[] = [];
    let start: number | null = null;
    for (let d = -window; d <= window + 1; d++) {
      const i = at(x + nx * d, y + ny * d);
      const ink = d <= window && i >= 0 && mask.data[i] === 1;
      if (ink && start === null) start = d;
      if (!ink && start !== null) {
        runs.push({ start, end: d - 1 });
        start = null;
      }
    }
    const thin = runs.filter((r) => r.end - r.start + 1 <= maxRun);
    if (!thin.length) continue;
    const nearest = thin.reduce((a, b) =>
      Math.abs((a.start + a.end) / 2 - offset) <= Math.abs((b.start + b.end) / 2 - offset) ? a : b,
    );
    // Only follow a run that continues the line; a stray stroke further off is left alone.
    if (Math.abs((nearest.start + nearest.end) / 2 - offset) > maxJump) continue;
    for (let d = nearest.start - pad; d <= nearest.end + pad; d++) {
      // Erase a little along the curve too, so steps don't leave crumbs between probes.
      for (const along of [-1, 0, 1]) {
        const i = at(x + nx * d - ny * along, y + ny * d + nx * along);
        if (i >= 0) data[i] = 0;
      }
    }
    offset = offset * 0.7 + ((nearest.start + nearest.end) / 2) * 0.3;
  }
  return { width: mask.width, height: mask.height, data };
}

/** Erases the drawn circle and the four drawn square edges by tracking each stroke. */
export function eraseDrawnShapes(mask: Mask, circle: Circle, edges: Edges, stroke: number): Mask {
  const opts = { window: stroke * 4, maxRun: stroke * 3, maxJump: stroke * 2 };
  const onCircle = (t: number) => {
    const a = t * Math.PI * 2;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: circle.cx + nx * circle.r, y: circle.cy + ny * circle.r, nx, ny };
  };
  // Two passes: the second catches stretches where the first lost the wobbling line.
  let out = eraseTrackedStroke(mask, onCircle, { steps: Math.round(circle.r * Math.PI * 2), ...opts });
  out = eraseTrackedStroke(out, onCircle, { steps: Math.round(circle.r * Math.PI * 2), ...opts });
  const { left, right, top, bottom } = edges;
  const horizontal = (y: number) => (t: number) => ({ x: left + (right - left) * t, y, nx: 0, ny: 1 });
  const vertical = (x: number) => (t: number) => ({ x, y: top + (bottom - top) * t, nx: 1, ny: 0 });
  out = eraseTrackedStroke(out, horizontal(top), { steps: right - left, ...opts });
  // Along the base the circle runs into the square, doubling the line's thickness.
  out = eraseTrackedStroke(out, horizontal(bottom), { steps: right - left, window: stroke * 4, maxRun: stroke * 4, maxJump: stroke * 2 });
  out = eraseTrackedStroke(out, vertical(left), { steps: bottom - top, ...opts });
  out = eraseTrackedStroke(out, vertical(right), { steps: bottom - top, ...opts });
  return out;
}

/** Labels 8-connected ink components: their pixel lists, areas and bounding boxes. */
function components(mask: Mask) {
  const { width, height, data } = mask;
  const label = new Int32Array(data.length).fill(-1);
  const result: { pixels: number[]; minX: number; maxX: number; minY: number; maxY: number }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < data.length; start++) {
    if (!data[start] || label[start] !== -1) continue;
    const c = { pixels: [] as number[], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    label[start] = result.length;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      c.pixels.push(i);
      const x = i % width;
      const y = (i - x) / width;
      c.minX = Math.min(c.minX, x);
      c.maxX = Math.max(c.maxX, x);
      c.minY = Math.min(c.minY, y);
      c.maxY = Math.max(c.maxY, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (data[j] && label[j] === -1) {
            label[j] = result.length;
            stack.push(j);
          }
        }
    }
    result.push(c);
  }
  return result;
}

/**
 * Drops stray marks: small components (under `minArea` px) with no large component
 * within `near` px, and flat horizontal slivers lying on `baseline` (what is left of the
 * square's drawn base). Leonardo's hatching survives because it sits next to the figure.
 */
export function dropStrays(mask: Mask, { minArea, near, baseline, stroke }: { minArea: number; near: number; baseline: number; stroke: number }): Mask {
  const all = components(mask);
  const big = new Uint8Array(mask.data.length);
  for (const c of all) if (c.pixels.length >= minArea) for (const i of c.pixels) big[i] = 1;
  // Dilate the large components by `near` with a summed-area table.
  const { width, height } = mask;
  const sat = new Uint32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += big[y * width + x]!;
      sat[(y + 1) * (width + 1) + x + 1] = sat[y * (width + 1) + x + 1]! + row;
    }
  }
  const nearBig = (x: number, y: number) => {
    const x0 = Math.max(0, x - near);
    const x1 = Math.min(width, x + near + 1);
    const y0 = Math.max(0, y - near);
    const y1 = Math.min(height, y + near + 1);
    return sat[y1 * (width + 1) + x1]! - sat[y0 * (width + 1) + x1]! - sat[y1 * (width + 1) + x0]! + sat[y0 * (width + 1) + x0]! > 0;
  };
  const data = mask.data.slice();
  for (const c of all) {
    const small = c.pixels.length < minArea;
    const cx = Math.round((c.minX + c.maxX) / 2);
    const cy = Math.round((c.minY + c.maxY) / 2);
    const isolated = small && !nearBig(cx, cy);
    const sliver = c.maxY - c.minY <= stroke * 2.5 && c.maxX - c.minX >= stroke * 8 && Math.abs(cy - baseline) <= stroke * 3;
    if (isolated || sliver) for (const i of c.pixels) data[i] = 0;
  }
  return { width, height, data };
}
