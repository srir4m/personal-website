import { forwardRef } from "react";

/** The Stevens marker: a sanguine dot, two expanding HUD rings and a crosshair. */
export const MarkerHud = forwardRef<HTMLDivElement>(function MarkerHud(_, ref) {
  return (
    <div ref={ref} className="globe-marker" aria-hidden="true">
      <span className="marker-ring" />
      <span className="marker-ring marker-ring--late" />
      <svg className="marker-cross" viewBox="-20 -20 40 40">
        <path d="M-18 0H-7M7 0H18M0 -18V-7M0 7V18" />
      </svg>
      <span className="marker-dot" />
    </div>
  );
});
