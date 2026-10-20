import { useEffect, useRef } from "react";
import { addProtocol, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
// MapLibre 6 builds its worker URL at runtime, which bundlers can't see; bundle it explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { actProgress, useStage } from "../../stage/store";
import { globeScaleAtDolly } from "../Act1Globe/layout";
import { cameraAt, circlePolygon, formatScale, highlightAt, scaleBar, scaleForZoom, zoomForScale } from "./camera";
import { buildStyle, hatchImage, MAP_COLORS } from "./style";

let protocolAdded = false;

/** Absolute URL of a public asset; works under any base, including a relative preview base. */
const assetUrl = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).href;

type Props = {
  range: { start: number; end: number };
  center: { lat: number; lng: number };
  areaLabel: string | null;
  /** Radius of the metro highlight, in km. */
  radiusKm?: number;
};

/**
 * The live map for the descent: MapLibre over self-hosted PMTiles, never interactive.
 * Scroll progress drives the camera through `cameraAt`; nothing re-renders in React.
 */
export default function MapView({ range, center, areaLabel, radiusKm = 32 }: Props) {
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
    const first = cameraAt(actProgress(range, useStage.getState().progress), startZoom());
    const map = new MapLibreMap({
      container: element,
      style: buildStyle(
        {
          world: assetUrl("assets/map/world.pmtiles"),
          region: assetUrl("assets/map/region.pmtiles"),
          city: assetUrl("assets/map/city.pmtiles"),
        },
        circlePolygon(center.lng, center.lat, radiusKm),
      ),
      center: [center.lng, center.lat],
      ...first,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      maxPitch: 70,
      pixelRatio: Math.min(window.devicePixelRatio, 1.75),
    });
    map.on("styleimagemissing", () => undefined);
    map.on("load", () => {
      map.addImage("water-hatch", hatchImage(MAP_COLORS.sepia, 6, 0.45));
      map.addImage("area-hatch", hatchImage(MAP_COLORS.sanguine, 7, 0.7));
      element.dataset.ready = "true";
      draw(useStage.getState().progress);
    });

    const draw = (progress: number) => {
      const t = actProgress(range, progress);
      const camera = cameraAt(t, startZoom());
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
      map.resize();
      draw(useStage.getState().progress);
    });
    observer.observe(element);
    return () => {
      unsubscribe();
      observer.disconnect();
      map.remove();
    };
  }, [range, center.lat, center.lng, radiusKm]);

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
