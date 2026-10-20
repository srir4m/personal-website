import { useEffect, useRef } from "react";
import { addProtocol, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
// MapLibre 6 builds its worker URL at runtime, which bundlers can't see; bundle it explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { actProgress, useStage } from "../../stage/store";
import { globeScaleAtDolly } from "../Act1Globe/layout";
import geometry from "../../content/vitruvian.json";
import { AREA_RADIUS_KM, cameraAt, circlePolygon, formatScale, highlightAt, RING_OVERSIZE, scaleBar, scaleForZoom, zoomForRing, zoomForScale } from "./camera";
import { buildStyle, hatchImage, MAP_COLORS } from "./style";

let protocolAdded = false;

/** Absolute URL of a public asset; works under any base, including a relative preview base. */
const assetUrl = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).href;

type Props = {
  range: { start: number; end: number };
  center: { lat: number; lng: number };
  areaLabel: string | null;
};

/**
 * The Vitruvian circle's radius on screen, in px: the figure is drawn at --figure-size
 * (globals.css), its viewBox letterboxed to fit. Measured, so it follows the CSS exactly.
 */
function vitruvianRadiusPx(host: HTMLElement): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;width:var(--figure-size)";
  host.appendChild(probe);
  const size = probe.offsetWidth;
  probe.remove();
  const [, , w, h] = geometry.viewBox as [number, number, number, number];
  return geometry.circle.r * Math.min(size / w, size / h);
}

/**
 * The live map for the descent: MapLibre over self-hosted PMTiles, never interactive.
 * Scroll progress drives the camera through `cameraAt`; nothing re-renders in React.
 */
export default function MapView({ range, center, areaLabel }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const scaleText = useRef<HTMLParagraphElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const barLabel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!protocolAdded) {
      setWorkerUrl(workerUrl);
      addProtocol("pmtiles", new Protocol().tile);
      protocolAdded = true;
    }
    const element = container.current!;
    const startZoom = () => zoomForScale(globeScaleAtDolly(element.clientHeight || window.innerHeight), center.lat);
    // The descent ends with the area's ring just outside the Vitruvian circle, which Becoming shrinks it onto.
    let ringPx = vitruvianRadiusPx(element) * RING_OVERSIZE;
    const endZoom = () => zoomForRing(ringPx, center.lat);
    const first = cameraAt(actProgress(range, useStage.getState().progress), startZoom(), endZoom());
    const map = new MapLibreMap({
      container: element,
      style: buildStyle(
        {
          world: assetUrl("assets/map/world.pmtiles"),
          region: assetUrl("assets/map/region.pmtiles"),
          city: assetUrl("assets/map/city.pmtiles"),
        },
        circlePolygon(center.lng, center.lat, AREA_RADIUS_KM),
      ),
      center: [center.lng, center.lat],
      ...first,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      maxPitch: 70,
      pixelRatio: Math.min(window.devicePixelRatio, 1.75),
    });
    // The hatch patterns are drawn on a canvas, so they're added the moment the style asks.
    const patterns: Record<string, () => ImageData> = {
      "water-hatch": () => hatchImage(MAP_COLORS.sepia, 6, 0.45),
      "area-hatch": () => hatchImage(MAP_COLORS.sanguine, 7, 0.7),
    };
    map.setMissingStyleImageResolver((id) => {
      const draw = patterns[id];
      if (draw && !map.hasImage(id)) map.addImage(id, draw());
    });
    map.on("load", () => {
      element.dataset.ready = "true";
      draw(useStage.getState().progress);
    });

    const draw = (progress: number) => {
      const t = actProgress(range, progress);
      const camera = cameraAt(t, startZoom(), endZoom());
      map.jumpTo({ center: [center.lng, center.lat], ...camera });
      element.dataset.zoom = camera.zoom.toFixed(2);
      const glow = highlightAt(t);
      if (map.isStyleLoaded()) {
        map.setPaintProperty("area-fill", "fill-opacity", 0.06 * glow);
        map.setPaintProperty("area-hatch", "fill-opacity", 0.4 * glow);
        map.setPaintProperty("area-rim", "line-opacity", glow);
      }
      if (label.current) {
        label.current.style.opacity = String(glow);
        const p = map.project([center.lng, center.lat]);
        label.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
      const denominator = scaleForZoom(camera.zoom, center.lat);
      if (scaleText.current) scaleText.current.textContent = formatScale(denominator);
      const { label: distance, px } = scaleBar(denominator);
      if (bar.current) bar.current.style.width = `${px.toFixed(1)}px`;
      if (barLabel.current) barLabel.current.textContent = distance;
    };

    draw(useStage.getState().progress);
    const unsubscribe = useStage.subscribe((s, prev) => s.progress !== prev.progress && draw(s.progress));
    const observer = new ResizeObserver(() => {
      ringPx = vitruvianRadiusPx(element) * RING_OVERSIZE;
      map.resize();
      draw(useStage.getState().progress);
    });
    observer.observe(element);
    return () => {
      unsubscribe();
      observer.disconnect();
      map.remove();
    };
  }, [range, center.lat, center.lng]);

  return (
    <div className="absolute inset-0">
      {/* Inline, because MapLibre's stylesheet sets its container to position: relative. */}
      <div ref={container} className="descent-map" style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
      {areaLabel && (
        <div ref={label} className="area-pin" aria-hidden="true">
          <div className="area-pin__label hud-panel">
            <p className="hud-label">Based in</p>
            <p className="font-display text-2xl leading-tight">{areaLabel}</p>
          </div>
        </div>
      )}
      <div className="descent-hud hud-panel">
        <p ref={scaleText} className="hud-readout" />
        <div className="scale-bar" aria-hidden="true">
          <div ref={bar} className="scale-bar__rule" />
          <span ref={barLabel} className="hud-label" />
        </div>
      </div>
      <p className="map-attribution">© OpenStreetMap contributors · Protomaps</p>
    </div>
  );
}
