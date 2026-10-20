import { useEffect, useRef } from "react";
import { addProtocol, type GeoJSONSource, Map as MapLibreMap, type MapSourceDataEvent, setWorkerUrl } from "maplibre-gl";
// MapLibre 6 builds its worker URL at runtime, which bundlers can't see; bundle it explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { actProgress, useStage } from "../../stage/store";
import { globeScaleAtDolly } from "../Act1Globe/layout";
import geometry from "../../content/vitruvian.json";
import {
  AREA_RADIUS_KM,
  buildingAt,
  cameraAt,
  circlePolygon,
  formatScale,
  highlightAt,
  RING_OVERSIZE,
  scaleBar,
  scaleForZoom,
  STREET_RADIUS_KM,
  streetRingAt,
  zoomForRing,
  zoomForScale,
  type LngLat,
} from "./camera";
import { buildStyle, hatchImage, MAP_COLORS } from "./style";

let protocolAdded = false;

type Ring = number[][];
/** Ray casting: is the point inside the polygon's outer ring (and outside its holes)? */
function inRing([x, y]: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi! > y !== yj! > y && x < ((xj! - xi!) * (y - yi!)) / (yj! - yi!) + xi!) inside = !inside;
  }
  return inside;
}

/** A plain copy: queried features are tile-backed objects that can't go to the worker. */
const plain = (geometry: GeoJSON.Geometry) => JSON.parse(JSON.stringify(geometry)) as GeoJSON.Geometry;

/** Every outer-ring corner of a polygon or multipolygon. */
function corners(geometry: GeoJSON.Geometry): [number, number][] {
  const polygons: Ring[][] = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  return polygons.flatMap((p) => (p[0] ?? []).map(([x, y]) => [x!, y!] as [number, number]));
}

/** The footprint grown slightly about its centre, so the red block covers the parchment one under it. */
function inflate(geometry: GeoJSON.Geometry, k = 1.015): GeoJSON.Geometry {
  const grow = (ring: Ring): Ring => {
    const cx = ring.reduce((sum, p) => sum + p[0]!, 0) / ring.length;
    const cy = ring.reduce((sum, p) => sum + p[1]!, 0) / ring.length;
    return ring.map(([x, y]) => [cx + (x! - cx) * k, cy + (y! - cy) * k]);
  };
  if (geometry.type === "Polygon") return { ...geometry, coordinates: geometry.coordinates.map(grow) };
  if (geometry.type === "MultiPolygon") return { ...geometry, coordinates: geometry.coordinates.map((p) => p.map(grow)) };
  return geometry;
}

/** The feature whose outline passes nearest the point, within `maxMetres`. */
function nearest<F extends { geometry: GeoJSON.Geometry }>(features: F[], [lng, lat]: [number, number], maxMetres: number): F | undefined {
  // Local metres east and north of the point.
  const kx = 111_320 * Math.cos((lat * Math.PI) / 180);
  const local = ([x, y]: number[]) => [(x! - lng) * kx, (y! - lat) * 110_574] as const;
  const toSegment = (a: readonly [number, number], b: readonly [number, number]) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(a[0] + t * dx, a[1] + t * dy);
  };
  let best: F | undefined;
  let bestD = maxMetres;
  for (const f of features) {
    const g = f.geometry;
    const polygons: Ring[][] = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const outer of polygons.map((p) => p[0] ?? [])) {
      for (let i = 1; i < outer.length; i++) {
        const d = toSegment(local(outer[i - 1]!), local(outer[i]!));
        if (d < bestD) [best, bestD] = [f, d];
      }
    }
  }
  return best;
}

function containsPoint(geometry: GeoJSON.Geometry, point: [number, number]): boolean {
  const polygons: Ring[][] = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  return polygons.some(([outer, ...holes]) => inRing(point, outer!) && !holes.some((hole) => inRing(point, hole)));
}

/** Absolute URL of a public asset; works under any base, including a relative preview base. */
const assetUrl = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).href;

type Props = {
  range: { start: number; end: number };
  center: LngLat;
  /** Where the street-level dive lands; null ends the descent on the metro ring. */
  street: LngLat | null;
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
export default function MapView({ range, center, street, areaLabel }: Props) {
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
    // The descent ends with a ring just outside the Vitruvian circle, which Becoming shrinks
    // onto it: around the street address if there is one, else around the metro area. The
    // metro ring is framed at the same size on screen, so the two rings rhyme.
    let ringPx = vitruvianRadiusPx(element) * RING_OVERSIZE;
    const path = () => {
      const metroZoom = zoomForRing(ringPx, center.lat, AREA_RADIUS_KM);
      const endZoom = street ? zoomForRing(ringPx, street.lat, STREET_RADIUS_KM) : metroZoom;
      return { startZoom: startZoom(), metroZoom, endZoom, area: center, street };
    };
    const first = cameraAt(actProgress(range, useStage.getState().progress), path());
    const map = new MapLibreMap({
      container: element,
      style: buildStyle(
        {
          world: assetUrl("assets/map/world.pmtiles"),
          region: assetUrl("assets/map/region.pmtiles"),
          city: assetUrl("assets/map/city.pmtiles"),
        },
        circlePolygon(center.lng, center.lat, AREA_RADIUS_KM),
        street && { ring: circlePolygon(street.lng, street.lat, STREET_RADIUS_KM) },
      ),
      ...first,
      center: [first.center.lng, first.center.lat],
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
    // The building at the address: the footprint in the street-level tiles that contains it.
    if (street) {
      // Looked up again each time the street tiles finish loading, so it uses the most
      // detailed tiles and every piece of the footprint.
      const findBuilding = (e: MapSourceDataEvent) => {
        if (e.sourceId !== "city" || !e.isSourceLoaded) return;
        const buildings = map.querySourceFeatures("city", { sourceLayer: "buildings" });
        if (!buildings.length) return;
        // The footprint holding the address, else the nearest one (a geocoded point can
        // fall on the pavement in front).
        const point: [number, number] = [street.lng, street.lat];
        const hit = buildings.find((f) => containsPoint(f.geometry, point)) ?? nearest(buildings, point, 12);
        if (!hit) return;
        // A footprint that crosses a tile edge comes back in pieces; the tiles' buffers make
        // the pieces overlap, so gather every piece with a corner inside the first one.
        const core = inflate(plain(hit.geometry), 0.97);
        const pieces = buildings.filter((f) => f === hit || corners(f.geometry).some((c) => containsPoint(core, c)));
        const { height, min_height } = hit.properties as { height?: number; min_height?: number };
        (map.getSource("street-building") as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: pieces.map((f) => ({ type: "Feature", properties: { height, min_height }, geometry: inflate(plain(f.geometry)) })),
        });
        element.dataset.streetBuilding = "found";
      };
      map.on("sourcedata", findBuilding);
    }
    map.on("load", () => {
      element.dataset.ready = "true";
      draw(useStage.getState().progress);
    });

    const draw = (progress: number) => {
      const t = actProgress(range, progress);
      const camera = cameraAt(t, path());
      map.jumpTo({ ...camera, center: [camera.center.lng, camera.center.lat] });
      element.dataset.zoom = camera.zoom.toFixed(2);
      element.dataset.pitch = camera.pitch.toFixed(0);
      const glow = highlightAt(t, street !== null);
      const ring = street ? streetRingAt(t) : 0;
      const building = street ? buildingAt(t) : 0;
      if (map.isStyleLoaded()) {
        map.setPaintProperty("area-fill", "fill-opacity", 0.06 * glow);
        map.setPaintProperty("area-hatch", "fill-opacity", 0.4 * glow);
        map.setPaintProperty("area-rim", "line-opacity", glow);
        if (street) {
          map.setPaintProperty("street-rim", "line-opacity", ring);
          map.setPaintProperty("street-building", "fill-extrusion-opacity", 0.9 * building);
        }
      }
      if (label.current) {
        label.current.style.opacity = String(glow);
        const p = map.project([center.lng, center.lat]);
        label.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
      const denominator = scaleForZoom(camera.zoom, camera.center.lat);
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
  }, [range, center, street]);

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
