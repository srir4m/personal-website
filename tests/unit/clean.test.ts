import { describe, expect, it } from "vitest";
import { cleanLuminance, tidy } from "../../src/pixel/clean";
import { INK, PAPER, SEPIA } from "../../src/pixel/scene";

/** A w × h paper image with marks painted in (value 0 is black ink). */
function image(w: number, h: number, marks: [x: number, y: number, v: number][]) {
  const lum = new Float32Array(w * h).fill(0.9);
  for (const [x, y, v] of marks) lum[y * w + x] = v;
  return lum;
}
const rect = (x0: number, y0: number, w: number, h: number, v: number) => {
  const out: [number, number, number][] = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.push([x, y, v]);
  return out;
};

describe("cleaning the figure", () => {
  it("flattens the paper and keeps the drawing's lines whole", () => {
    const line = rect(5, 20, 60, 2, 0.1);
    const out = cleanLuminance(image(80, 40, line), 80, 40);
    expect(out[0]).toBe(1);
    expect(out[20 * 80 + 30]).toBeCloseTo(0.1);
  });

  it("removes specks and small faint marks, but keeps small dark ones such as an eye", () => {
    const speck = rect(2, 2, 2, 2, 0.1);
    const faint = rect(30, 5, 6, 5, 0.5);
    const eye = rect(60, 5, 6, 4, 0.15);
    const out = cleanLuminance(image(80, 40, [...speck, ...faint, ...eye]), 80, 40);
    expect(out[2 * 80 + 2]).toBe(1);
    expect(out[6 * 80 + 31]).toBe(1);
    expect(out[6 * 80 + 61]).toBeCloseTo(0.15);
  });

  it("removes thin faint strokes left by the scan", () => {
    const scanLine = rect(10, 30, 40, 1, 0.5);
    const out = cleanLuminance(image(80, 40, scanLine), 80, 40);
    expect(out[30 * 80 + 20]).toBe(1);
  });
});

describe("tidying a figure grid", () => {
  it("drops lone pixels and closes one-pixel breaks in a stroke", () => {
    const res = 8, g = new Uint8Array(res * res).fill(PAPER);
    g[1 * res + 1] = INK; // alone
    g[4 * res + 2] = INK;
    g[4 * res + 4] = INK; // a break at (3, 4)
    g[5 * res + 2] = INK;
    g[5 * res + 4] = SEPIA; // a break at (3, 5) between ink and sepia
    const out = tidy(g, res);
    expect(out[1 * res + 1]).toBe(PAPER);
    expect(out[4 * res + 3]).toBe(INK);
    expect(out[5 * res + 3]).toBe(SEPIA);
  });
});
