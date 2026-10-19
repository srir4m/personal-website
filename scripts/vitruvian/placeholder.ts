/**
 * Placeholder Vitruvian figure, used until the owner's scan is traced (PRD §8.2). It is
 * NOT Leonardo's drawing: an engraved mannequin on Leonardo's geometry (square side =
 * height = arm span; circle centred on the navel, tangent to the square's base), drawn
 * in both poses like the original. It is replaced by `npm run vitruvian:trace`.
 *
 * Writes public/assets/vitruvian/figure.svg and src/content/vitruvian.json, and
 * src/content/regions.json when that file doesn't exist yet (or with --regions).
 *
 * Run with `npm run vitruvian:placeholder`.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const SIZE = 1000;
const square = { x: 150, y: 220, size: 700 };
const bottom = square.y + square.size;
const circle = { cx: 500, cy: bottom - 427, r: 427 };

type Pt = [number, number];
type Limb = { from: Pt; to: Pt; width: number; taper?: number };

const onCircle = (y: number, side: -1 | 1): Pt => [circle.cx + side * Math.sqrt(circle.r ** 2 - (circle.cy - y) ** 2), y];

const shoulders: [Pt, Pt] = [
  [438, 362],
  [562, 362],
];
const hips: [Pt, Pt] = [
  [474, 590],
  [526, 590],
];

const core: Limb[] = [
  { from: [500, 308], to: [500, 336], width: 34 },
  { from: [500, 350], to: [500, 470], width: 128, taper: 0.8 },
  { from: [500, 470], to: [500, 590], width: 100, taper: 1.05 },
  { from: shoulders[0], to: shoulders[1], width: 44 },
];

const nowLimbs: Limb[] = [
  { from: shoulders[0], to: [square.x + 34, 362], width: 34, taper: 0.55 },
  { from: shoulders[1], to: [square.x + square.size - 34, 362], width: 34, taper: 0.55 },
  { from: hips[0], to: [482, bottom - 22], width: 50, taper: 0.5 },
  { from: hips[1], to: [518, bottom - 22], width: 50, taper: 0.5 },
];

const fingertipsUp = [onCircle(square.y, -1), onCircle(square.y, 1)];
const feetApart = [onCircle(bottom - 44, -1), onCircle(bottom - 44, 1)];
const reachingLimbs: Limb[] = [
  { from: shoulders[0], to: [fingertipsUp[0]![0] + 26, fingertipsUp[0]![1] + 16], width: 34, taper: 0.55 },
  { from: shoulders[1], to: [fingertipsUp[1]![0] - 26, fingertipsUp[1]![1] + 16], width: 34, taper: 0.55 },
  { from: hips[0], to: [feetApart[0]![0] + 20, feetApart[0]![1] - 4], width: 50, taper: 0.5 },
  { from: hips[1], to: [feetApart[1]![0] - 20, feetApart[1]![1] - 4], width: 50, taper: 0.5 },
];

/** A tapered capsule outline from `from` to `to`. */
function capsule({ from, to, width, taper = 1 }: Limb): string {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const r1 = width / 2;
  const r2 = (width * taper) / 2;
  const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
  return [
    `M${p(x1 + nx * r1, y1 + ny * r1)}`,
    `L${p(x2 + nx * r2, y2 + ny * r2)}`,
    `A${r2.toFixed(1)},${r2.toFixed(1)} 0 0 0 ${p(x2 - nx * r2, y2 - ny * r2)}`,
    `L${p(x1 - nx * r1, y1 - ny * r1)}`,
    `A${r1.toFixed(1)},${r1.toFixed(1)} 0 0 0 ${p(x1 + nx * r1, y1 + ny * r1)}Z`,
  ].join("");
}

/** An engraved group: ink outline of the union, parchment fill, sepia hatching inside. */
function engraved(id: string, shapes: string[], extra = ""): string {
  const d = shapes.join("");
  return `<g id="${id}">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <path d="${d}" fill="var(--parchment, #EFE4CC)"/>
    <path d="${d}" fill="url(#vitruvian-hatch)" opacity="0.55"/>
    ${extra}
  </g>`;
}

const head = (() => {
  const [cx, cy, rx, ry] = [500, 268, 40, 48];
  return `M${cx - rx},${cy}A${rx},${ry} 0 1 0 ${cx + rx},${cy}A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`;
})();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" data-source="placeholder">
  <defs>
    <pattern id="vitruvian-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#8A6B47" stroke-width="1"/>
    </pattern>
  </defs>
  ${engraved("pose-reaching", reachingLimbs.map(capsule))}
  ${engraved("pose-now", nowLimbs.map(capsule))}
  ${engraved("core", [...core.map(capsule), head], `<path d="M486,262h8M506,262h8M494,288h12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="500" cy="${circle.cy.toFixed(0)}" r="3" fill="currentColor"/>`)}
</svg>
`;

mkdirSync("public/assets/vitruvian", { recursive: true });
writeFileSync("public/assets/vitruvian/figure.svg", svg);
writeFileSync(
  "src/content/vitruvian.json",
  `${JSON.stringify({ source: "placeholder", viewBox: [0, 0, SIZE, SIZE], circle, square }, null, 2)}\n`,
);

// ---- Default regions, normalised to the viewBox (PRD Act 5) ---------------------

type Poly = Pt[];
const n = (poly: Poly): Poly => poly.map(([x, y]) => [Number((x / SIZE).toFixed(4)), Number((y / SIZE).toFixed(4))]);
const box = (x0: number, y0: number, x1: number, y1: number): Poly => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const ellipse = (cx: number, cy: number, rx: number, ry: number, steps = 16): Poly =>
  Array.from({ length: steps }, (_, i) => [cx + Math.cos((i / steps) * 2 * Math.PI) * rx, cy + Math.sin((i / steps) * 2 * Math.PI) * ry]);
/** A quadrilateral around a limb, padded by `pad`. */
const around = ({ from, to, width }: Limb, pad = 8): Poly => {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const nx = -Math.sin(angle) * (width / 2 + pad);
  const ny = Math.cos(angle) * (width / 2 + pad);
  return [
    [from[0] + nx, from[1] + ny],
    [to[0] + nx, to[1] + ny],
    [to[0] - nx, to[1] - ny],
    [from[0] - nx, from[1] - ny],
  ];
};

const regions = {
  // Polygon order matters only for overlap: later regions sit on top (the heart over the chest).
  regions: {
    head: [n(ellipse(500, 266, 34, 44))],
    ears: [n(ellipse(456, 270, 10, 16, 10)), n(ellipse(544, 270, 10, 16, 10))],
    chest: [n(box(436, 350, 564, 450))],
    spine: [n(box(486, 452, 514, 590))],
    arms: [...nowLimbs.slice(0, 2).map((l) => n(around(l))), ...reachingLimbs.slice(0, 2).map((l) => n(around(l)))],
    stomach: [n(box(446, 452, 486, 585)), n(box(514, 452, 554, 585))],
    legs: [...nowLimbs.slice(2).map((l) => n(around(l))), ...reachingLimbs.slice(2).map((l) => n(around(l)))],
    feet: [n(box(455, bottom - 60, 545, bottom + 10)), n(ellipse(feetApart[0]![0] + 22, feetApart[0]![1], 34, 30)), n(ellipse(feetApart[1]![0] - 22, feetApart[1]![1], 34, 30))],
    heart: [n(ellipse(522, 400, 22, 22, 12))],
  },
  masks: {
    poseNow: nowLimbs.map((l) => n(around(l, 4))),
    poseReaching: reachingLimbs.map((l) => n(around(l, 4))),
  },
};
const regionsPath = "src/content/regions.json";
if (!existsSync(regionsPath) || process.argv.includes("--regions")) {
  writeFileSync(regionsPath, `${JSON.stringify(regions, null, 2)}\n`);
  console.log(`Wrote ${regionsPath}`);
}
console.log("Wrote public/assets/vitruvian/figure.svg and src/content/vitruvian.json (placeholder)");
