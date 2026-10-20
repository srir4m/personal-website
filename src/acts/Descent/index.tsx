import { lazy, Suspense } from "react";
import { content } from "../../content";
import { text } from "../../content/text";
import { ACT_RANGES } from "../../stage/acts";
import { hasWebGL } from "../Act1Globe/globeData";
import type { ActProps } from "../registry";

// MapLibre is large; it loads only when the descent is about to be seen.
const MapView = lazy(() => import("./MapView"));

/** The owner's area: city or metro level only (PRD v1.1, decision Q8). */
const area = content.owner.area;

/**
 * The descent (issue #4): the globe hands off to a live vector map that zooms to the
 * owner's area, highlights it at metro scale, then tilts down into 3D streets.
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
        <MapView range={ACT_RANGES[index]!} center={{ lat: area.lat, lng: area.lng }} areaLabel={label} />
      </Suspense>
      {label && (
        <p className="sr-only">
          The globe gives way to a map that zooms in on the {label} and tilts down into the city's streets.
        </p>
      )}
    </div>
  );
}
