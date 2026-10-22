import { INK, PAPER, SEPIA } from "./scene";

/**
 * Cleaning the figure for the pixel scene (owner request, issue #8): the baked drawing is
 * lifted off a scan, so it carries paper speckle and faint stray marks around the lines.
 * Pure and unit-tested; src/pixel/sources.ts runs it once when the figure loads.
 */

/** Luminance below this is ink; above it the paper is flattened to plain paper. */
export const INK_BELOW = 0.62;

export type CleanOptions = {
  /** Marks smaller than this many pixels are specks: always removed. */
  speck: number;
  /** Small marks (both sides under this many pixels) are removed when faint... */
  small: number;
  /** ...where faint means a mean luminance above this. Small dark marks (eyes, curls) stay. */
  faint: number;
  /** Thin faint strokes (at most this many pixels across, this many times longer than wide) are scan lines: removed. */
  thin: number;
  stretch: number;
};

export const CLEAN: CleanOptions = { speck: 8, small: 18, faint: 0.42, thin: 3, stretch: 6 };

/**
 * Removes specks and faint stray marks from a luminance image (0 ink to 1 paper), and
 * flattens the paper. Marks are 8-connected groups of ink pixels; each is kept or dropped
 * whole, so the drawing's own lines are never nibbled. Returns a new image.
 */
export function cleanLuminance(lum: Float32Array, w: number, h: number, o: CleanOptions = CLEAN): Float32Array {
  const out = new Float32Array(lum.length);
  const label = new Int32Array(lum.length).fill(-1);
  const stack = new Int32Array(lum.length);
  for (let start = 0; start < lum.length; start++) {
    if (lum[start]! >= INK_BELOW) {
      out[start] = 1;
      continue;
    }
    if (label[start] !== -1) continue;
    // Flood one mark, collecting its pixels, bounds and mean luminance.
    let top = 0, n = 0, sum = 0;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack[top++] = start;
    label[start] = start;
    const members: number[] = [];
    while (top) {
      const i = stack[--top]!;
      members.push(i);
      n++;
      sum += lum[i]!;
      const x = i % w, y = (i - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          if (label[j] === -1 && lum[j]! < INK_BELOW) {
            label[j] = start;
            stack[top++] = j;
          }
        }
      }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, mean = sum / n;
    const faint = mean > o.faint;
    const drop =
      n < o.speck ||
      (faint && bw < o.small && bh < o.small) ||
      (faint && Math.min(bw, bh) <= o.thin && Math.max(bw, bh) >= o.stretch * Math.min(bw, bh));
    for (const i of members) out[i] = drop ? 1 : lum[i]!;
  }
  return out;
}

/**
 * Tidies a posterised figure grid: an ink pixel with no ink around it goes, and a paper
 * pixel between two ink pixels (left and right, or above and below) is filled, so lines
 * read as unbroken strokes at every resolution. Returns a new grid.
 */
export function tidy(grid: Uint8Array, res: number): Uint8Array {
  const out = grid.slice();
  const ink = (x: number, y: number) => x >= 0 && y >= 0 && x < res && y < res && grid[y * res + x] !== PAPER;
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const i = y * res + x;
      if (grid[i] !== PAPER) {
        let neighbours = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && ink(x + dx, y + dy)) neighbours++;
        if (neighbours === 0) out[i] = PAPER;
      } else if ((ink(x - 1, y) && ink(x + 1, y)) || (ink(x, y - 1) && ink(x, y + 1))) {
        // The gap takes the lighter of its two sides, so a fill never darkens a stroke.
        const sides = ink(x - 1, y) && ink(x + 1, y) ? [grid[i - 1]!, grid[i + 1]!] : [grid[i - res]!, grid[i + res]!];
        out[i] = sides.includes(SEPIA) ? SEPIA : INK;
      }
    }
  }
  return out;
}
