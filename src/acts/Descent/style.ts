import type { StyleSpecification, LayerSpecification, FilterSpecification } from "maplibre-gl";

/**
 * A Codex HUD map style for the Protomaps (OpenStreetMap) basemap schema: parchment
 * land, hatched sepia water, ink roads, and parchment buildings that extrude near the
 * ground. No labels, so no glyph files or font requests are needed.
 */
const C = {
  parchment: "#EFE4CC",
  deep: "#E2D3B0",
  park: "#E7DCC0",
  water: "#D8CBAA",
  ink: "#2B2118",
  sepia: "#8A6B47",
  sanguine: "#A8432F",
};

export type TileSources = { world: string; region: string; city: string };

/** Each source draws only where it is the right detail: world at low zoom, then the region, then the city patch. */
const ZOOMS = { world: { maxzoom: 7 }, region: { minzoom: 5.8 }, city: { minzoom: 12.8 } } as const;

function layersFor(source: keyof TileSources): LayerSpecification[] {
  const z = ZOOMS[source];
  const id = (name: string) => `${source}-${name}`;
  const base = { source, ...z };
  // The world's land and water stay on (overzoomed) under the region and city extracts,
  // so the screen never shows an empty edge where a detailed extract's bounding box ends.
  const fills = source === "world" ? { source } : base;
  const parks: FilterSpecification = ["in", ["get", "kind"], ["literal", ["park", "forest", "wood", "nature_reserve", "grass", "garden", "cemetery", "golf_course", "recreation_ground"]]];
  return [
    { id: id("earth"), type: "fill", "source-layer": "earth", ...fills, paint: { "fill-color": C.parchment } },
    { id: id("parks"), type: "fill", "source-layer": "landuse", ...base, filter: parks, paint: { "fill-color": C.park } },
    { id: id("water"), type: "fill", "source-layer": "water", ...fills, paint: { "fill-color": C.water } },
    { id: id("water-hatch"), type: "fill", "source-layer": "water", ...fills, paint: { "fill-pattern": "water-hatch" } },
    {
      id: id("coast"),
      type: "line",
      "source-layer": "water",
      ...base,
      paint: { "line-color": C.sepia, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 14, 1.2], "line-opacity": 0.7 },
    },
    {
      id: id("boundaries"),
      type: "line",
      "source-layer": "boundaries",
      ...base,
      filter: ["==", ["get", "kind"], "country"],
      paint: { "line-color": C.sepia, "line-width": 0.8, "line-dasharray": [3, 2] },
    },
    {
      id: id("minor-roads"),
      type: "line",
      "source-layer": "roads",
      ...base,
      filter: ["in", ["get", "kind"], ["literal", ["minor_road", "path"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.sepia,
        "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0.2, 15, 1.6],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0, 12.5, 0.8],
      },
    },
    {
      id: id("major-roads"),
      type: "line",
      "source-layer": "roads",
      ...base,
      filter: ["in", ["get", "kind"], ["literal", ["major_road", "highway"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": C.ink,
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 6, ["match", ["get", "kind"], "highway", 0.5, 0.2], 15, ["match", ["get", "kind"], "highway", 5, 3]],
        "line-opacity": 0.85,
      },
    },
  ];
}

/** The street address's ring, which becomes the Vitruvian circle, when there is one. */
export type StreetMarks = { ring: [number, number][] };

export function buildStyle(tiles: TileSources, area: [number, number][], street: StreetMarks | null): StyleSpecification {
  const streetLayers: StyleSpecification["layers"] = street
    ? [
        // The building at the address, raised in red chalk among the parchment blocks.
        // Its footprint is found at runtime (see MapView), so the source starts empty.
        {
          id: "street-building",
          type: "fill-extrusion",
          source: "street-building",
          paint: {
            "fill-extrusion-color": C.sanguine,
            "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 12], 0.6],
            "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
            "fill-extrusion-opacity": 0,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        {
          id: "street-rim",
          type: "line",
          source: "street-ring",
          paint: { "line-color": C.sanguine, "line-width": 1.5, "line-dasharray": [4, 3], "line-opacity": 0 },
        },
      ]
    : [];
  return {
    version: 8,
    sources: {
      world: { type: "vector", url: `pmtiles://${tiles.world}` },
      region: { type: "vector", url: `pmtiles://${tiles.region}` },
      city: { type: "vector", url: `pmtiles://${tiles.city}` },
      area: {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [area] } },
      },
      ...(street && {
        "street-ring": {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: street.ring } },
        },
        "street-building": { type: "geojson", data: { type: "FeatureCollection", features: [] } },
      }),
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": C.water } },
      ...layersFor("world"),
      ...layersFor("region"),
      ...layersFor("city"),
      // The owner's area: a soft red-chalk wash with a dashed rim, at metro scale only.
      { id: "area-fill", type: "fill", source: "area", paint: { "fill-color": C.sanguine, "fill-opacity": 0 } },
      { id: "area-hatch", type: "fill", source: "area", paint: { "fill-pattern": "area-hatch", "fill-opacity": 0 } },
      {
        id: "area-rim",
        type: "line",
        source: "area",
        paint: { "line-color": C.sanguine, "line-width": 1.5, "line-dasharray": [4, 3], "line-opacity": 0 },
      },
      {
        id: "buildings",
        type: "fill-extrusion",
        source: "city",
        "source-layer": "buildings",
        minzoom: 13.5,
        paint: {
          "fill-extrusion-color": C.deep,
          "fill-extrusion-height": ["coalesce", ["get", "height"], 12],
          "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
          "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 14.4, 0.95],
          "fill-extrusion-vertical-gradient": true,
        },
      },
      ...streetLayers,
    ],
  };
}

/** Hatch patterns drawn on a canvas at load, so the style needs no sprite files. */
export function hatchImage(color: string, spacing: number, alpha: number, size = 16): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  for (let offset = -size; offset < size * 2; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(offset, size);
    ctx.lineTo(offset + size, 0);
    ctx.stroke();
  }
  return ctx.getImageData(0, 0, size, size);
}

export const MAP_COLORS = C;
