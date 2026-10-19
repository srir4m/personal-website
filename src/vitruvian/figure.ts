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
};

export const VITRUVIAN = geometry as VitruvianGeometry;

/** The figure's inner SVG markup (everything inside the root <svg>). */
export const FIGURE_MARKUP = figureSource.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

export const VIEWBOX = VITRUVIAN.viewBox.join(" ");
