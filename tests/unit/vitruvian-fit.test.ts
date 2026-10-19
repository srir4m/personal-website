import { describe, expect, it } from "vitest";
import { contrastStretch, eraseShapes, fitCircle, fitSquare, otsu, toMask, type Mask } from "../../scripts/vitruvian/fit";

/** A synthetic "scan": square, circle, a stick figure, and paper noise. */
function synthetic(): Mask {
  const width = 600;
  const height = 600;
  const data = new Uint8Array(width * height);
  const ink = (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi >= 0 && yi >= 0 && xi < width && yi < height) data[yi * width + xi] = 1;
  };
  const square = { x: 100, y: 160, size: 400 };
  for (let t = 0; t <= square.size; t += 0.5)
    for (let w = -1; w <= 1; w++) {
      ink(square.x + t, square.y + w);
      ink(square.x + t, square.y + square.size + w);
      ink(square.x + w, square.y + t);
      ink(square.x + square.size + w, square.y + t);
    }
  const circle = { cx: 300, cy: 316, r: 244 };
  for (let a = 0; a < Math.PI * 2; a += 0.002)
    for (let w = -1; w <= 1; w++) ink(circle.cx + Math.cos(a) * (circle.r + w), circle.cy + Math.sin(a) * (circle.r + w));
  // Figure: head, spine, arms, legs.
  for (let a = 0; a < Math.PI * 2; a += 0.01) ink(300 + Math.cos(a) * 25, 190 + Math.sin(a) * 25);
  for (let y = 215; y < 420; y++) for (let w = -6; w <= 6; w++) ink(300 + w, y);
  for (let x = 110; x < 490; x++) for (let w = -4; w <= 4; w++) ink(x, 250 + w);
  for (let y = 420; y < 555; y++) for (let w = -5; w <= 5; w++) {
    ink(285 + w - (y - 420) * 0.05, y);
    ink(315 + w + (y - 420) * 0.05, y);
  }
  let seed = 3;
  for (let i = 0; i < 1500; i++) {
    seed = (seed * 16807) % 2147483647;
    data[seed % data.length] = 1;
  }
  return { width, height, data };
}

describe("Vitruvian shape fitting", () => {
  const mask = synthetic();

  it("finds the square to within 1% of its side", () => {
    const square = fitSquare(mask);
    expect(Math.abs(square.x - 100)).toBeLessThan(4);
    expect(Math.abs(square.y - 160)).toBeLessThan(4);
    expect(Math.abs(square.size - 400)).toBeLessThan(4);
  });

  it("finds the circle to within 1% of its radius", () => {
    const circle = fitCircle(mask, fitSquare(mask));
    expect(Math.abs(circle.cx - 300)).toBeLessThan(3);
    expect(Math.abs(circle.cy - 316)).toBeLessThan(3);
    expect(Math.abs(circle.r - 244)).toBeLessThan(3);
  });

  it("erases the circle and square but keeps the figure", () => {
    const square = fitSquare(mask);
    const cleaned = eraseShapes(mask, fitCircle(mask, square), square, 4);
    const at = (x: number, y: number) => cleaned.data[y * cleaned.width + x];
    expect(at(300, 160)).toBe(0); // square's top edge
    expect(at(300, 72)).toBe(0); // circle's top
    expect(at(300, 300)).toBe(1); // spine
    expect(at(200, 250)).toBe(1); // arm
  });

  it("thresholds a grey ramp sensibly", () => {
    const grey = Uint8Array.from({ length: 1000 }, (_, i) => (i < 300 ? 40 + (i % 20) : 200 + (i % 30)));
    const stretched = contrastStretch(grey);
    const t = otsu(stretched);
    const m = toMask(stretched, 1000, 1, t);
    expect(m.data.slice(0, 300).every((v) => v === 1)).toBe(true);
    expect(m.data.slice(300).every((v) => v === 0)).toBe(true);
  });
});
