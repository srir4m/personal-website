import { forwardRef } from "react";

/**
 * The globe marker: two expanding HUD rings and a crosshair around a sanguine dot. As an
 * `area` marker it drops the dot for a dashed ring: a region, not a point.
 */
export const MarkerHud = forwardRef<HTMLDivElement, { area?: boolean }>(function MarkerHud({ area = false }, ref) {
  return (
    <div ref={ref} className={`globe-marker ${area ? "globe-marker--area" : ""}`} aria-hidden="true">
      <span className="marker-ring" />
      <span className="marker-ring marker-ring--late" />
      <svg className="marker-cross" viewBox="-20 -20 40 40">
        <path d="M-18 0H-7M7 0H18M0 -18V-7M0 7V18" />
      </svg>
      {area ? <span className="marker-area" /> : <span className="marker-dot" />}
    </div>
  );
});
