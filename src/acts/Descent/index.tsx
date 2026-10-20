import { lazy, Suspense } from "react";
import { content } from "../../content";
import { text } from "../../content/text";
import { ACT_RANGES } from "../../stage/acts";
import { hasWebGL } from "../Act1Globe/globeData";
import type { ActProps } from "../registry";

// MapLibre is large; it loads only when the descent is about to be seen.
const MapView = lazy(() => import("./MapView"));

/** The owner's area at metro level, and the street address the dive lands on (owner's choice). */
const area = content.owner.area;
const center = area && { lat: area.lat, lng: area.lng };
const street = area?.street ? { lat: area.street.lat, lng: area.street.lng } : null;

/**
 * The descent (issue #4): the globe hands off to a live vector map that zooms to the
 * owner's area and rings it at metro scale, dives among the 3D buildings to a street
 * address, then rises to look straight down on a ring around it, which Becoming takes over.
 */
export default function Descent({ index }: ActProps) {
  const label = area ? text(area.label) : null;
  if (!area) return <div className="h-full w-full bg-parchment" />;
  if (!hasWebGL()) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-parchment">
        <div className="hud-panel" role="note">
          <p className="hud-label">Based in</p>
          <p className="font-display text-3xl">{label}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Suspense fallback={null}>
        <MapView range={ACT_RANGES[index]!} center={center!} street={street} areaLabel={label} />
      </Suspense>
      {label && (
        <p className="sr-only">
          The globe gives way to a map that zooms in on the {label}, then dives down among the buildings to street level.
        </p>
      )}
    </div>
  );
}
