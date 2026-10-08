import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { numericToAlpha2 } from "i18n-iso-countries";
import { MdMyLocation } from "react-icons/md";
import { BsCamera, BsFullscreen, BsFullscreenExit } from "react-icons/bs";
import { useTheme } from "../../theme/useTheme";
import {
  getInstitutionsMap,
  getInstitutionsByCountry,
  type InstitutionFeatureCollection,
} from "../../api/works";
import worldCountriesUrl from "world-atlas/countries-110m.json?url";
import "./MapGlobe.css";

// maplibre-gl's worker is two ES modules where the worker imports the shared
// one by relative path — copied verbatim into public/ (scripts/copy-maplibre-worker.mjs)
// so that relative import still resolves, instead of Vite's hashed /assets/ output.
maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}vendor/maplibre/maplibre-gl-worker.mjs`);

const KEY = import.meta.env.VITE_MAPTILER_KEY as string;

const STYLE_LIGHT = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${KEY}`;
const STYLE_DARK  = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`;

// Degrees of bounding-box padding beyond the visible viewport. Avoids re-fetching
// on small pans — institutions within the padded area are already loaded.
const BBOX_PAD = 10;

// Debounce delay (ms) between the last map movement event and the API fetch.
const FETCH_DEBOUNCE_MS = 400;

// Bar footprint (width/depth) in degrees — the smallest and largest an
// institution's square base can be, scaled by its author count relative to
// the biggest one currently on screen.
const BAR_RADIUS_MIN_DEG = 0.15;
const BAR_RADIUS_MAX_DEG = 0.9;

// Extrusion height in meters — works count drives this, same relative scaling.
const BAR_HEIGHT_MIN_M = 20_000;
const BAR_HEIGHT_MAX_M = 700_000;

export type ClickedInstitution = {
  id: string;
  name: string;
  workCount: number;
  authorCount: number;
  citationCount: number;
  countryCode: string;
};

type MapGlobeProps = {
  compact?: boolean;
  onInstitutionClick?: (inst: ClickedInstitution) => void;
};

// ---------------------------------------------------------------------------
// GeoJSON builders — institution bars
// ---------------------------------------------------------------------------

function squareRing(lat: number, lng: number, halfSizeDeg: number): number[][] {
  // A plain square (not geo-correct at high latitudes, but visually fine at
  // the zoom levels these bars are actually shown at).
  return [
    [lng - halfSizeDeg, lat - halfSizeDeg],
    [lng + halfSizeDeg, lat - halfSizeDeg],
    [lng + halfSizeDeg, lat + halfSizeDeg],
    [lng - halfSizeDeg, lat + halfSizeDeg],
    [lng - halfSizeDeg, lat - halfSizeDeg],
  ];
}

/**
 * Log-interpolate `value` (0..max) into [outMin, outMax], guarding max === 0.
 * Author/work counts are power-law distributed (a few mega-institutions,
 * a long tail of small ones) — a linear 0..max scale would make every bar
 * but the single biggest one look negligible, so this compresses the high
 * end and expands the low end instead, the same way the backend's own
 * importance score (rawScore) already does with log1p.
 */
function scale(value: number, max: number, outMin: number, outMax: number): number {
  if (max <= 0) return outMin;
  const t = Math.min(Math.max(Math.log1p(value) / Math.log1p(max), 0), 1);
  return outMin + t * (outMax - outMin);
}

function toExtrusionFC(points: InstitutionFeatureCollection): FeatureCollection<Polygon> {
  const maxAuthors = points.features.reduce((m, f) => Math.max(m, f.properties.authorCount), 0);
  const maxWorks   = points.features.reduce((m, f) => Math.max(m, f.properties.workCount), 0);

  return {
    type: "FeatureCollection",
    features: points.features.map((f): Feature<Polygon> => {
      const [lng, lat] = f.geometry.coordinates;
      const halfSize = scale(f.properties.authorCount, maxAuthors, BAR_RADIUS_MIN_DEG, BAR_RADIUS_MAX_DEG) / 2;
      const height   = scale(f.properties.workCount, maxWorks, BAR_HEIGHT_MIN_M, BAR_HEIGHT_MAX_M);
      return {
        type: "Feature",
        id: f.id,
        geometry: { type: "Polygon", coordinates: [squareRing(lat, lng, halfSize)] },
        properties: { ...f.properties, height },
      };
    }),
  };
}

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

// ---------------------------------------------------------------------------
// GeoJSON builder — country choropleth (2D mode)
// ---------------------------------------------------------------------------

async function buildCountryChoropleth(
  workCountsByAlpha2: Map<string, number>,
): Promise<FeatureCollection> {
  const res = await fetch(worldCountriesUrl);
  const topology = (await res.json()) as Topology;
  const countriesObject = topology.objects.countries;
  const fc = topoFeature(topology, countriesObject) as unknown as FeatureCollection;

  for (const f of fc.features) {
    const alpha2 = numericToAlpha2(String(f.id));
    const workCount = (alpha2 && workCountsByAlpha2.get(alpha2)) || 0;
    f.properties = { ...f.properties, workCount };
  }
  return fc;
}

// ---------------------------------------------------------------------------
// Layer management
// ---------------------------------------------------------------------------

function ensureLayers(map: maplibregl.Map) {
  if (!map.getSource("inst-extrusion")) {
    map.addSource("inst-extrusion", { type: "geojson", data: EMPTY_FC });
  }
  if (!map.getSource("country-choropleth")) {
    map.addSource("country-choropleth", { type: "geojson", data: EMPTY_FC });
  }

  if (!map.getLayer("inst-extrusion")) {
    map.addLayer({
      id: "inst-extrusion",
      type: "fill-extrusion",
      source: "inst-extrusion",
      paint: {
        // Citations-per-work drives color: cool (low-impact) -> hot (high-impact).
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["get", "citationsPerWork"],
          0,  "#3b82f6",
          5,  "#22c55e",
          15, "#f59e0b",
          40, "#ef4444",
        ],
        "fill-extrusion-opacity": 0.88,
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": 0,
      },
    });
  }

  if (!map.getLayer("country-choropleth")) {
    map.addLayer({
      id: "country-choropleth",
      type: "fill",
      source: "country-choropleth",
      paint: {
        "fill-color": [
          "interpolate", ["linear"], ["get", "workCount"],
          0,     "rgba(59, 130, 246, 0.05)",
          50,    "#1d4ed8",
          500,   "#7c3aed",
          5000,  "#db2777",
          50000, "#f59e0b",
        ],
        "fill-outline-color": "rgba(255,255,255,0.15)",
      },
    });
  }
}

function applyLayerVisibility(map: maplibregl.Map, globe: boolean) {
  if (map.getLayer("inst-extrusion"))    map.setLayoutProperty("inst-extrusion",    "visibility", globe ? "visible" : "none");
  if (map.getLayer("country-choropleth")) map.setLayoutProperty("country-choropleth", "visibility", globe ? "none" : "visible");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MapGlobe({ compact = false, onInstitutionClick }: MapGlobeProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  // Refs mirror state so event callbacks see current values without re-registering listeners.
  const themeRef  = useRef(theme);
  themeRef.current = theme;

  const onInstClickRef = useRef(onInstitutionClick);
  onInstClickRef.current = onInstitutionClick;

  const [isGlobe, setIsGlobe] = useState(true);
  const isGlobeRef = useRef(isGlobe);
  isGlobeRef.current = isGlobe;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Country work-counts only need fetching once per mount, not on every pan/zoom.
  const countryDataRef = useRef<FeatureCollection | null>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: themeRef.current === "dark" ? STYLE_DARK : STYLE_LIGHT,
      center: [13.405, 30],
      zoom: compact ? 1.2 : 1.5,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right",
    );

    const applyAll = () => {
      map.setProjection({ type: isGlobeRef.current ? "globe" : "mercator" });
      ensureLayers(map);
      applyLayerVisibility(map, isGlobeRef.current);
      scheduleFetch(map);
      loadCountryChoropleth(map);
    };

    // `load` fires on first full render; `style.load` fires on every setStyle
    // (theme swaps). Custom layers are wiped on setStyle, so we re-add them both times.
    map.once("load",     applyAll);
    map.on("style.load", applyAll);

    // Debounce institution-bar data updates on camera movement.
    map.on("moveend", () => scheduleFetch(map));
    map.on("zoomend", () => scheduleFetch(map));

    map.on("click", "inst-extrusion", (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      onInstClickRef.current?.({
        id:            String(f.id ?? p.name),
        name:          String(p.name ?? ""),
        workCount:     Number(p.workCount ?? 0),
        authorCount:   Number(p.authorCount ?? 0),
        citationCount: Number(p.citationCount ?? 0),
        countryCode:   String(p.countryCode ?? ""),
      });
    });
    map.on("mouseenter", "inst-extrusion", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "inst-extrusion", () => { map.getCanvas().style.cursor = ""; });

    mapRef.current = map;
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skip first run — map was already created with the correct style.
  const themeInitialized = useRef(false);
  useEffect(() => {
    if (!themeInitialized.current) { themeInitialized.current = true; return; }
    mapRef.current?.setStyle(theme === "dark" ? STYLE_DARK : STYLE_LIGHT);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setProjection({ type: isGlobe ? "globe" : "mercator" });
    applyLayerVisibility(map, isGlobe);
  }, [isGlobe]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  function scheduleFetch(map: maplibregl.Map) {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => doFetchInstitutions(map), FETCH_DEBOUNCE_MS);
  }

  async function doFetchInstitutions(map: maplibregl.Map) {
    const bounds = map.getBounds();
    try {
      const fc: InstitutionFeatureCollection = await getInstitutionsMap({
        zoom:   map.getZoom(),
        // Clamped to ±180/±90 — at low zoom (near-whole-world view) the padded
        // bbox otherwise exceeds valid lng/lat and the backend's DTO validation
        // rejects it outright (max(-190) < -180). Clamping independently per
        // bound is safe even when the view straddles the antimeridian, since
        // the backend's inBbox() already treats minLng > maxLng as a wrap.
        minLng: Math.max(bounds.getWest()  - BBOX_PAD, -180),
        maxLng: Math.min(bounds.getEast()  + BBOX_PAD,  180),
        minLat: Math.max(bounds.getSouth() - BBOX_PAD, -90),
        maxLat: Math.min(bounds.getNorth() + BBOX_PAD,  90),
      });
      if (mapRef.current !== map) return;
      const src = map.getSource("inst-extrusion") as maplibregl.GeoJSONSource | undefined;
      src?.setData(toExtrusionFC(fc));
    } catch (err) {
      console.error("[MapGlobe] institutions fetch error", err);
    }
  }

  async function loadCountryChoropleth(map: maplibregl.Map) {
    try {
      if (!countryDataRef.current) {
        const counts = await getInstitutionsByCountry();
        const byAlpha2 = new Map(counts.map((c) => [c.countryCode, c.workCount]));
        countryDataRef.current = await buildCountryChoropleth(byAlpha2);
      }
      if (mapRef.current !== map) return;
      const src = map.getSource("country-choropleth") as maplibregl.GeoJSONSource | undefined;
      src?.setData(countryDataRef.current);
    } catch (err) {
      console.error("[MapGlobe] choropleth load error", err);
    }
  }

  // ---------------------------------------------------------------------------
  // UI handlers
  // ---------------------------------------------------------------------------

  function handleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapperRef.current?.requestFullscreen();
  }

  function handleScreenshot() {
    const map = mapRef.current;
    if (!map) return;
    map.once("render", () => {
      map.getCanvas().toBlob((blob: Blob | null) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `globe-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    });
    map.triggerRepaint();
  }

  function handleRecenter() {
    mapRef.current?.flyTo({
      center: [13.405, 30],
      zoom: compact ? 1.2 : 1.5,
      bearing: 0,
      pitch: isGlobeRef.current ? 45 : 0,
      duration: 800,
    });
  }

  return (
    <div ref={wrapperRef} className={compact ? "mapGlobeWrapper mapGlobeWrapperCompact" : "mapGlobeWrapper"}>
      <div ref={containerRef} className="mapGlobe" />
      <button
        className="globeBtn globeProjectionToggle"
        onClick={() => setIsGlobe((g) => !g)}
        title={isGlobe ? "Switch to 2D map" : "Switch to 3D globe"}
      >
        {isGlobe ? "2D" : "3D"}
      </button>
      <button className="globeBtn globeResetBtn" onClick={handleRecenter} title="Reset to default view">
        <MdMyLocation size={14} />
      </button>
      {!compact && (
        <>
          <button className="globeBtn globeScreenshotBtn" onClick={handleScreenshot} title="Save screenshot">
            <BsCamera size={13} />
          </button>
          <button
            className="globeBtn globeFullscreenBtn"
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <BsFullscreenExit size={12} /> : <BsFullscreen size={12} />}
          </button>
        </>
      )}
    </div>
  );
}
