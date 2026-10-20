import { forwardRef } from "react";
import { content } from "../../content";
import { text } from "../../content/text";

/** The globe's target: the owner's area at city or metro level (PRD v1.1, Q7/Q8), else Stevens. */
export const GLOBE_TARGET = content.owner.area ?? content.education.location;

/** "40.7°N 74.0°W": one decimal place, which is roughly 10 km, coarse on purpose. */
export function formatCoarse(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(1)}°${lng >= 0 ? "E" : "W"}`;
}

/** The HUD card tied to the globe's marker: where the owner is based. */
export const AreaCard = forwardRef<HTMLDivElement>(function AreaCard(_, ref) {
  const label = text(GLOBE_TARGET.label);
  return (
    <div ref={ref} className="globe-card hud-panel">
      <p className="hud-label">Based in</p>
      {label && <h3 className="font-display text-3xl leading-tight">{label}</h3>}
      <p className="hud-readout">{formatCoarse(GLOBE_TARGET.lat, GLOBE_TARGET.lng)}</p>
    </div>
  );
});
