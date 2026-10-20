/**
 * The site's one easing and duration scale (issue #8). Every timed animation uses these;
 * scroll-scrubbed tweens stay linear ("none"), since the scroll is their easing. The CSS
 * side mirrors them as --ease and --dur-* in tokens.css.
 */
export const EASE = "power2.inOut";
/** The same curve as a cubic Bézier, for CSS and Motion. */
export const EASE_BEZIER = [0.45, 0, 0.55, 1] as const;

/** Seconds. */
export const DURATION = { quick: 0.2, base: 0.4, slow: 1.2 } as const;
