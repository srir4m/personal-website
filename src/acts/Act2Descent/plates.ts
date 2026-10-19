/**
 * The descent plates (PRD §8.3). Each plate is drawn at 16:9 and declares `childRect`,
 * the normalised rectangle inside itself where the next plate sits. Child rectangles
 * keep the plate's aspect ratio, so `w === h` in normalised units.
 *
 * `scale` is the map scale when the plate exactly covers the viewport at 96 dpi; it
 * drives the HUD scale readout, and the P1 value also sets the globe handoff.
 */
export type Rect = { x: number; y: number; w: number; h: number };

export type Plate = {
  id: string;
  src: string;
  aspect: number;
  childRect?: Rect;
  /** P1 only: where Castle Point sits on the plate, for the globe handoff. */
  anchor?: { x: number; y: number };
  label: string;
  /** Scale denominator: 250_000 means 1 : 250,000. */
  scale: number;
};

const base = `${import.meta.env.BASE_URL}assets/plates/`;

export const PLATES: Plate[] = [
  {
    id: "P1",
    src: `${base}p1.svg`,
    aspect: 16 / 9,
    childRect: { x: 0.47, y: 0.43, w: 0.1, h: 0.1 },
    anchor: { x: 0.52, y: 0.48 },
    label: "New York Harbor",
    scale: 250_000,
  },
  {
    id: "P2",
    src: `${base}p2.svg`,
    aspect: 16 / 9,
    childRect: { x: 0.56, y: 0.36, w: 0.1, h: 0.1 },
    label: "Hoboken",
    scale: 25_000,
  },
  {
    id: "P3",
    src: `${base}p3.svg`,
    aspect: 16 / 9,
    childRect: { x: 0.42, y: 0.3, w: 0.1, h: 0.1 },
    label: "Castle Point",
    scale: 2_500,
  },
  {
    id: "P4",
    src: `${base}p4.svg`,
    aspect: 16 / 9,
    childRect: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
    label: "A lit window",
    scale: 250,
  },
  { id: "P5", src: `${base}p5.svg`, aspect: 16 / 9, label: "The room", scale: 50 },
];
