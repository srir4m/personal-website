import figureSource from "../../public/assets/vitruvian/figure.svg?raw";
import geometry from "../content/vitruvian.json";

/**
 * The Vitruvian figure (PRD §8.2): traced from the owner's scan by
 * `npm run vitruvian:trace`, or a placeholder until then. Inlined, so it inherits
 * `currentColor` (ink) and can be masked and animated.
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

/** The figure's inner SVG markup (everything inside the root <svg>). */
export const FIGURE_MARKUP = figureSource.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

export const VIEWBOX = VITRUVIAN.viewBox.join(" ");

/** The frame to redraw: the drawn edges when known, otherwise the ideal square. */
export const FRAME = VITRUVIAN.edges ?? {
  left: VITRUVIAN.square.x,
  top: VITRUVIAN.square.y,
  right: VITRUVIAN.square.x + VITRUVIAN.square.size,
  bottom: VITRUVIAN.square.y + VITRUVIAN.square.size,
};
