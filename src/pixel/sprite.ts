import { ACCENT, DEEP, INK, PAPER, SEPIA } from "./scene";

/**
 * The companion (pixel move, issue #8, PR 5): Leonardo's ornithopter as a pixel sprite,
 * after zidankazi.com's dragon. Front view, wings on a mast over a small hull, a red
 * pennant. It flaps only while the reader scrolls and perches by Contact at the end.
 * Pure: the sprite grids and the flight path; src/pixel/Companion.tsx paints them.
 */
export const SPRITE_W = 40;
export const SPRITE_H = 26;
/** Transparent, in a sprite grid. */
export const CLEAR = 255;

export type Pose = "up" | "mid" | "down" | "folded";
/** One flap: up, level, down, level. */
export const FLAP: Pose[] = ["up", "mid", "down", "mid"];
/** Scroll distance (CSS px) per flap frame, and how long after the last scroll it glides. */
export const FLAP_PX = 34;
export const GLIDE_MS = 450;

/** A sprite with wings at `theta` radians above level (negative is below), `span` pixels long. */
export function spriteFrame(theta: number, span = 17): Uint8Array {
  const g = new Uint8Array(SPRITE_W * SPRITE_H).fill(CLEAR);
  const set = (x: number, y: number, v: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < SPRITE_W && y < SPRITE_H) g[y * SPRITE_W + x] = v;
  };
  const line = (a: [number, number], b: [number, number], v: number) => {
    const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) || 1;
    for (let i = 0; i <= n; i++) set(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, v);
  };
  const inside = (poly: [number, number][], x: number, y: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const cx = 19.5, sy = 11;
  for (const s of [-1, 1]) {
    // u runs along the wing, v across it towards the trailing edge.
    const u = [s * Math.cos(theta), -Math.sin(theta)], v = [s * Math.sin(theta), Math.cos(theta)];
    const at = (f: number, d: number): [number, number] => [cx + u[0]! * span * f + v[0]! * d, sy + u[1]! * span * f + v[1]! * d];
    const root = at(0, 0), tip = at(1, 0), trail = [at(1, 1), at(0.68, 4.5), at(0.36, 6), at(0.05, 6.5)];
    const membrane = [root, tip, ...trail];
    for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) if (inside(membrane, x + 0.5, y + 0.5)) g[y * SPRITE_W + x] = DEEP;
    for (let i = 0; i < trail.length - 1; i++) line(trail[i]!, trail[i + 1]!, SEPIA);
    for (const t of trail.slice(1)) line(root, t, SEPIA);
    line(root, tip, INK);
    line([root[0], root[1] - 1], [tip[0], tip[1] - 1], INK);
  }
  line([cx, 5], [cx, 16], INK); // the mast
  for (const [x, y] of [[20.5, 5], [21.5, 5], [22.5, 5], [20.5, 6], [21.5, 6]] as const) set(x, y, ACCENT); // the pennant
  for (let y = 16; y <= 19; y++) {
    const w = y === 19 ? 3 : 5;
    for (let x = cx - w; x <= cx + w; x++) set(x, y, Math.abs(x - cx) >= w - 0.5 || y === 19 ? INK : DEEP); // the hull
  }
  for (const [x, y] of [[cx, 14], [cx, 15], [cx - 1, 15], [cx + 1, 15]] as const) set(x, y, INK); // the pilot
  // A one-pixel paper outline, so it reads against any scene.
  const out = g.slice();
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      if (g[y * SPRITE_W + x] !== CLEAR) continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const X = x + dx!, Y = y + dy!;
        return X >= 0 && Y >= 0 && X < SPRITE_W && Y < SPRITE_H && g[Y * SPRITE_W + X] !== CLEAR;
      });
      if (touches) out[y * SPRITE_W + x] = PAPER;
    }
  }
  return out;
}

export const POSES: Record<Pose, Uint8Array> = {
  up: spriteFrame(0.6),
  mid: spriteFrame(0.08),
  down: spriteFrame(-0.38),
  folded: spriteFrame(-1.15, 10),
};

/** The pose: folded once perched, gliding when still, otherwise the flap frame for the distance scrolled. */
export function poseFor({ perched, arrived, still, sinceScroll, travelled }: { perched: boolean; arrived: boolean; still: boolean; sinceScroll: number; travelled: number }): Pose {
  if (perched && arrived) return "folded";
  if (still || sinceScroll > GLIDE_MS) return "mid";
  return FLAP[Math.floor(travelled / FLAP_PX) % FLAP.length]!;
}

/**
 * Where it wants to be (CSS px, its top-left corner): beside the column while the reader
 * reads (drifting with the scroll), top right on phones, and on the Contact title's line at
 * the end. `perch` is the title's box; `column` the paper column's.
 */
export function targetFor({
  perched,
  phone,
  scrollY,
  viewport,
  column,
  perch,
  size,
}: {
  perched: boolean;
  phone: boolean;
  scrollY: number;
  viewport: { w: number; h: number };
  column: { right: number };
  perch: { left: number; right: number; top: number; bottom: number } | null;
  size: { w: number; h: number };
}): { x: number; y: number } {
  if (perched && perch) {
    // The folded sprite's hull spans its middle half and ends a fifth above its bottom edge:
    // set the hull just after the title's last letter, resting on its baseline.
    const x = perch.right + 6 - size.w * 0.22;
    const y = perch.bottom - size.h * 0.8;
    // When the title runs to the column's edge, it perches above the title's end instead.
    return x + size.w * 0.78 > column.right - 8 ? { x: column.right - size.w * 0.78 - 12, y: perch.top - size.h * 0.8 } : { x, y };
  }
  if (phone) return { x: viewport.w - size.w - 14, y: 60 + Math.sin(scrollY / 260) * 10 };
  return { x: column.right + 36 + Math.sin(scrollY / 520) * 56, y: viewport.h * 0.2 + Math.sin(scrollY / 340) * 26 };
}
