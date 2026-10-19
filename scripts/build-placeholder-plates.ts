/**
 * Writes procedural placeholder plates P1–P5 to public/assets/plates/ (PRD §8.3): simple
 * engraved drawings in ink and sepia, each labelled PLACEHOLDER and showing its childRect,
 * so the zoom can be tuned before final art exists. Replace the files with real art at will;
 * keep the childRect and anchor values in src/acts/Act2Descent/plates.ts in step with the art.
 *
 * Run with `npm run plates:placeholder`.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1600;
const H = 900;
const INK = "#2B2118";
const SEPIA = "#8A6B47";
const SANGUINE = "#A8432F";
const PARCHMENT = "#EFE4CC";
const DEEP = "#E2D3B0";

type Rect = { x: number; y: number; w: number; h: number };
type PlateSpec = { id: string; title: string; scale: string; child?: Rect; childId?: string; anchor?: { x: number; y: number }; art: () => string };

let seed = 7;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const n = (value: number) => value.toFixed(1);

/** A wobbly closed outline around a centre, like an engraved coast. */
function blob(cx: number, cy: number, rx: number, ry: number, wobble = 0.18, points = 48): string {
  const phase = random() * 10;
  let d = "";
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = 1 + wobble * (Math.sin(a * 3 + phase) * 0.5 + Math.sin(a * 7 + phase * 2) * 0.3 + (random() - 0.5) * 0.4);
    d += `${i ? "L" : "M"}${n(cx + Math.cos(a) * rx * r)},${n(cy + Math.sin(a) * ry * r)}`;
  }
  return `${d}Z`;
}

/** Concentric offset outlines of a blob: engraved contour lines. */
function contours(cx: number, cy: number, rx: number, ry: number, count: number, color = SEPIA) {
  let out = "";
  for (let i = 1; i <= count; i++) {
    const k = 1 - i / (count + 1);
    out += `<path d="${blob(cx, cy, rx * k, ry * k, 0.12)}" fill="none" stroke="${color}" stroke-width="1" opacity="${0.35 + 0.4 * (1 - k)}"/>`;
  }
  return out;
}

function frame(spec: PlateSpec): string {
  const ticks = Array.from({ length: 33 }, (_, i) => {
    const x = 40 + i * ((W - 80) / 32);
    return `<path d="M${n(x)},40V${i % 4 ? 48 : 56}M${n(x)},${H - 40}V${H - (i % 4 ? 48 : 56)}" stroke="${INK}" stroke-width="1"/>`;
  }).join("");
  return `
    <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="${INK}" stroke-width="1.5"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${INK}" stroke-width="0.75"/>
    ${ticks}
    <g font-family="IBM Plex Mono, monospace" fill="${INK}">
      <rect x="64" y="64" width="420" height="78" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1"/>
      <text x="80" y="94" font-size="20" letter-spacing="4">${spec.id} · ${spec.title.toUpperCase()}</text>
      <text x="80" y="124" font-size="14" letter-spacing="3" fill="${SANGUINE}">PLACEHOLDER PLATE · ${spec.scale}</text>
    </g>`;
}

function childMarker(spec: PlateSpec): string {
  if (!spec.child) return "";
  const { x, y, w, h } = spec.child;
  const [rx, ry, rw, rh] = [x * W, y * H, w * W, h * H];
  return `
    <rect x="${n(rx)}" y="${n(ry)}" width="${n(rw)}" height="${n(rh)}" fill="${DEEP}" stroke="${SANGUINE}" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="${n(rx)}" y="${n(ry - 8)}" font-family="IBM Plex Mono, monospace" font-size="13" letter-spacing="2" fill="${SANGUINE}">${spec.childId} →</text>`;
}

function anchorMarker(spec: PlateSpec): string {
  if (!spec.anchor) return "";
  const [x, y] = [spec.anchor.x * W, spec.anchor.y * H];
  return `<circle cx="${n(x)}" cy="${n(y)}" r="5" fill="${SANGUINE}"/><circle cx="${n(x)}" cy="${n(y)}" r="12" fill="none" stroke="${SANGUINE}" stroke-width="1"/>`;
}

const hatchDefs = `
  <defs>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="${SEPIA}" stroke-width="1.1"/>
    </pattern>
    <pattern id="cross" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="${INK}" stroke-width="0.8" opacity="0.5"/>
      <line x1="0" y1="0" x2="9" y2="0" stroke="${INK}" stroke-width="0.8" opacity="0.5"/>
    </pattern>
    <pattern id="water" width="24" height="10" patternUnits="userSpaceOnUse">
      <path d="M0,5 Q6,2 12,5 T24,5" fill="none" stroke="${SEPIA}" stroke-width="0.8" opacity="0.55"/>
    </pattern>
  </defs>`;

const label = (x: number, y: number, text: string, size = 18, italic = true) =>
  `<text x="${x}" y="${y}" font-family="Cormorant Garamond, serif" font-size="${size}" ${italic ? 'font-style="italic"' : ""} fill="${INK}" letter-spacing="2">${text}</text>`;

const plates: PlateSpec[] = [
  {
    id: "P1",
    title: "New York Harbor",
    scale: "1 : 250,000",
    child: { x: 0.47, y: 0.43, w: 0.1, h: 0.1 },
    childId: "P2",
    anchor: { x: 0.52, y: 0.48 },
    art: () => `
      <rect width="${W}" height="${H}" fill="url(#water)"/>
      <path d="M0,0H700L760,260L790,420L820,560L760,900H0Z" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1.5"/>
      <path d="M0,0H700L760,260L790,420L820,560L760,900H0Z" fill="url(#hatch)" opacity="0.5"/>
      ${contours(330, 420, 300, 380, 5)}
      <path d="${blob(990, 360, 70, 330, 0.08)}" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1.5"/>
      <path d="${blob(990, 360, 70, 330, 0.08)}" fill="url(#cross)"/>
      <path d="M1180,0H1600V900H1260L1200,640L1150,420Z" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1.5"/>
      <path d="M1180,0H1600V900H1260L1200,640L1150,420Z" fill="url(#hatch)" opacity="0.5"/>
      ${contours(1420, 450, 200, 380, 4)}
      ${label(860, 200, "Hudson", 26)}
      ${label(960, 760, "Upper Bay", 22)}
      ${label(380, 640, "New Jersey", 30, false)}
      ${label(1330, 300, "Brooklyn · Queens", 24, false)}
      ${label(1010, 120, "Manhattan", 22)}`,
  },
  {
    id: "P2",
    title: "Hoboken",
    scale: "1 : 25,000",
    child: { x: 0.56, y: 0.36, w: 0.1, h: 0.1 },
    childId: "P3",
    art: () => {
      let grid = "";
      for (let x = 100; x < 1080; x += 70) grid += `<path d="M${x},60V840" stroke="${INK}" stroke-width="1" opacity="0.6"/>`;
      for (let y = 80; y < 860; y += 46) grid += `<path d="M60,${y}H1080" stroke="${INK}" stroke-width="0.8" opacity="0.5"/>`;
      return `
        <path d="M1080,0H1600V900H1120Q1060,700 1110,520T1080,0Z" fill="url(#water)"/>
        <path d="M1080,0Q1110,260 1100,420T1120,900" fill="none" stroke="${INK}" stroke-width="1.5"/>
        <g transform="rotate(-6 560 450)">${grid}</g>
        <path d="M860,230L1090,250L1100,480L880,500Z" fill="url(#hatch)" stroke="${INK}" stroke-width="1.5"/>
        ${label(880, 220, "Stevens campus", 22)}
        ${label(1250, 420, "Hudson River", 28)}
        ${label(300, 880, "Washington St · Hudson St · River St", 16, false)}`;
    },
  },
  {
    id: "P3",
    title: "Castle Point",
    scale: "1 : 2,500",
    child: { x: 0.42, y: 0.3, w: 0.1, h: 0.1 },
    childId: "P4",
    art: () => {
      let windows = "";
      for (let col = 0; col < 10; col++)
        for (let row = 0; row < 4; row++)
          windows += `<rect x="${430 + col * 82}" y="${250 + row * 110}" width="44" height="70" fill="none" stroke="${INK}" stroke-width="1"/>`;
      return `
        <path d="M0,760Q400,700 800,740T1600,720V900H0Z" fill="url(#hatch)" stroke="${INK}" stroke-width="1"/>
        <rect x="400" y="200" width="840" height="520" fill="${PARCHMENT}" stroke="${INK}" stroke-width="2"/>
        <path d="M380,200L820,90L1260,200Z" fill="url(#cross)" stroke="${INK}" stroke-width="1.5"/>
        ${windows}
        <rect x="770" y="600" width="100" height="120" fill="url(#cross)" stroke="${INK}" stroke-width="1.5"/>
        ${label(420, 780, "Castle Point · facade elevation", 22)}`;
    },
  },
  {
    id: "P4",
    title: "A lit window",
    scale: "1 : 250",
    child: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
    childId: "P5",
    art: () => `
      <rect width="${W}" height="${H}" fill="url(#cross)" opacity="0.6"/>
      <rect x="560" y="250" width="480" height="420" fill="${PARCHMENT}" stroke="${INK}" stroke-width="3"/>
      <rect x="600" y="290" width="400" height="340" fill="#F2D9A6" stroke="${INK}" stroke-width="1.5"/>
      <path d="M800,290V630M600,460H1000" stroke="${INK}" stroke-width="3"/>
      <rect x="540" y="670" width="520" height="24" fill="url(#hatch)" stroke="${INK}" stroke-width="1.5"/>
      ${label(560, 230, "lamplight · third floor", 22)}`,
  },
  {
    id: "P5",
    title: "The room",
    scale: "1 : 50",
    art: () => `
      <rect width="${W}" height="${H}" fill="#F2D9A6" opacity="0.35"/>
      <path d="M0,640H1600" stroke="${INK}" stroke-width="1.5"/>
      <rect x="380" y="520" width="840" height="30" fill="url(#hatch)" stroke="${INK}" stroke-width="1.5"/>
      <path d="M420,550V760M1180,550V760" stroke="${INK}" stroke-width="3"/>
      ${[0, 1, 2]
        .map((i) => `<rect x="${470 + i * 250}" y="350" width="200" height="140" fill="${DEEP}" stroke="${INK}" stroke-width="2"/><path d="M${570 + i * 250},490V520" stroke="${INK}" stroke-width="3"/>`)
        .join("")}
      ${label(560, 300, "the desk where the squad meets", 24)}`,
  },
];

const out = new URL("../public/assets/plates/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const spec of plates) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  ${hatchDefs}
  <rect width="${W}" height="${H}" fill="${PARCHMENT}"/>
  ${spec.art()}
  ${childMarker(spec)}
  ${anchorMarker(spec)}
  ${frame(spec)}
</svg>
`;
  writeFileSync(new URL(`${spec.id.toLowerCase()}.svg`, out), svg);
  console.log(`${spec.id}: ${(svg.length / 1024).toFixed(1)} KB`);
}
