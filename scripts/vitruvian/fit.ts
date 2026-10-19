/**
 * Image analysis for the Vitruvian tracing pipeline (PRD §8.2): threshold a scan into an
 * ink mask, find the drawing's square and circle, and erase them so potrace only traces
 * the figure. The clean geometry is then redrawn as real <rect> and <circle> elements.
 */
export type Mask = { width: number; height: number; data: Uint8Array };
export type Circle = { cx: number; cy: number; r: number };
export type Square = { x: number; y: number; size: number };

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
  const size = (bottom - top + (right - left)) / 2;
  return { x: (left + right) / 2 - size / 2, y: (top + bottom) / 2 - size / 2, size };
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

/** Clears ink within `band` px of the circle's and square's outlines. */
export function eraseShapes(mask: Mask, circle: Circle, square: Square, band: number): Mask {
  const data = mask.data.slice();
  const { width, height } = mask;
  const right = square.x + square.size;
  const bottom = square.y + square.size;
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
