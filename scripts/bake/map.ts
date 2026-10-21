/**
 * Dev-only page for `npm run pixel:bake` (scripts/bake-pixel.ts): renders the descent's
 * MapLibre style over the self-hosted tiles at a given camera, with no highlights, so the
 * pixel scene gets plain map frames to downsample. Served by Vite; never built or deployed.
 */
import { addProtocol, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { AREA_RADIUS_KM, circlePolygon } from "../../src/acts/Descent/camera";
import { buildStyle, hatchImage, MAP_COLORS } from "../../src/acts/Descent/style";

export type Shot = { lng: number; lat: number; zoom: number; pitch: number; bearing: number };

setWorkerUrl(workerUrl);
addProtocol("pmtiles", new Protocol().tile);
const tile = (name: string) => new URL(`/assets/map/${name}.pmtiles`, location.href).href;

const map = new MapLibreMap({
  container: "map",
  // The area polygon is required by the style; its layers start invisible and stay so.
  style: buildStyle({ world: tile("world"), region: tile("region"), city: tile("city") }, circlePolygon(-74, 40.7, AREA_RADIUS_KM), null),
  center: [-74, 40.7],
  zoom: 4,
  interactive: false,
  attributionControl: false,
  fadeDuration: 0,
  maxPitch: 70,
  pixelRatio: 1,
  canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
});
const patterns: Record<string, () => ImageData> = {
  "water-hatch": () => hatchImage(MAP_COLORS.sepia, 6, 0.45),
  "area-hatch": () => hatchImage(MAP_COLORS.sanguine, 7, 0.7),
};
map.setMissingStyleImageResolver((id) => {
  const draw = patterns[id];
  if (draw && !map.hasImage(id)) map.addImage(id, draw());
});

const loaded = new Promise<void>((resolve) => map.once("load", () => resolve()));

/** Moves the camera and resolves once every tile for the view has loaded and drawn. */
async function shoot(shot: Shot): Promise<void> {
  await loaded;
  map.jumpTo({ center: [shot.lng, shot.lat], zoom: shot.zoom, pitch: shot.pitch, bearing: shot.bearing });
  await new Promise<void>((resolve) => map.once("idle", () => resolve()));
}

Object.assign(window, { shoot });
