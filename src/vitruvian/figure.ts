import geometry from "../content/vitruvian.json";
import { figLeafMarkup } from "./figLeaf";

/**
 * The Vitruvian figure (PRD §8.2): Leonardo's drawing lifted off the owner's scan as ink
 * by `npm run vitruvian:trace` (public/assets/vitruvian/figure.webp), with a fig leaf
 * over the groin. Inlined as SVG markup, so it can be masked and animated.
 */
export type VitruvianGeometry = {
  source: "placeholder" | "traced";
  viewBox: [number, number, number, number];
  circle: { cx: number; cy: number; r: number };
  square: { x: number; y: number; size: number };
  /** The square's edges as drawn (a hand-drawn square is slightly off); traced figures only. */
  edges?: { left: number; right: number; top: number; bottom: number };
};

export const VITRUVIAN = geometry as VitruvianGeometry;

export const VIEWBOX = VITRUVIAN.viewBox.join(" ");

const [vx, vy, vw, vh] = VITRUVIAN.viewBox;

/** The figure's SVG markup, to place inside an <svg> with VIEWBOX. */
export const FIGURE_MARKUP = `<image href="${import.meta.env.BASE_URL}assets/vitruvian/figure.webp" x="${vx}" y="${vy}" width="${vw}" height="${vh}" preserveAspectRatio="none" decoding="async"/>${figLeafMarkup()}`;

/** The frame to redraw: the drawn edges when known, otherwise the ideal square. */
export const FRAME = VITRUVIAN.edges ?? {
  left: VITRUVIAN.square.x,
  top: VITRUVIAN.square.y,
  right: VITRUVIAN.square.x + VITRUVIAN.square.size,
  bottom: VITRUVIAN.square.y + VITRUVIAN.square.size,
};
