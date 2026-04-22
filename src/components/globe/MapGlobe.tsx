import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MdMyLocation } from "react-icons/md";
import { BsCamera, BsFullscreen, BsFullscreenExit } from "react-icons/bs";
import { useTheme } from "../../theme/useTheme";
import {
  getInstitutionsMap,
  type InstitutionFeature,
  type InstitutionFeatureCollection,
} from "../../api/institutions";
import "./MapGlobe.css";

const KEY = import.meta.env.VITE_MAPTILER_KEY as string;

const STYLE_LIGHT = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${KEY}`;
const STYLE_DARK  = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`;

// Degrees of bounding-box padding beyond the visible viewport. Avoids re-fetching
// on small pans — institutions within the padded area are already loaded.
const BBOX_PAD = 10;

// Debounce delay (ms) between the last map movement event and the API fetch.
const FETCH_DEBOUNCE_MS = 400;

// Extrusion base radius in degrees. All spikes share the same footprint; height carries the data.
const EXTRUSION_RADIUS_DEG = 0.5;

export type ClickedInstitution = {
  id: string;
  name: string;
  workCount: number;
  citationCount: number;
  countryCode: string;
};

type MapGlobeProps = {
  compact?: boolean;
  onInstitutionClick?: (inst: ClickedInstitution) => void;
};

// ---------------------------------------------------------------------------
// GeoJSON builders
// ---------------------------------------------------------------------------

function toExtrusionFC(points: InstitutionFeatureCollection): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.features.map((f) => toPolygon(f)),
  };
}

function toPolygon(f: InstitutionFeature): GeoJSON.Feature {
  const [lng, lat] = f.geometry.coordinates;
  const coords = circleRing(lat, lng, EXTRUSION_RADIUS_DEG);
  return {
    type: "Feature",
    id: f.id,
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: f.properties,
  };
}

function circleRing(lat: number, lng: number, r: number, steps = 32): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    pts.push([lng + r * Math.cos(a), lat + r * Math.sin(a)]);
  }
  return pts;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

// ---------------------------------------------------------------------------
// Layer management
// ---------------------------------------------------------------------------

function ensureInstitutionLayers(map: maplibregl.Map) {
  const hadPointsSrc = !!map.getSource("inst-points");
  const hadExtSrc    = !!map.getSource("inst-extrusion");
  const hadCircles   = !!map.getLayer("inst-circles");
  const hadExtrusion = !!map.getLayer("inst-extrusion");

  if (!hadPointsSrc)  map.addSource("inst-points",    { type: "geojson", data: EMPTY_FC });
  if (!hadExtSrc)     map.addSource("inst-extrusion", { type: "geojson", data: EMPTY_FC });

  if (!hadCircles) {
    map.addLayer({
      id: "inst-circles",
      type: "circle",
      source: "inst-points",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "score"], 0, 4, 1, 14],
        "circle-color": "#e05c2a",
        "circle-opacity": 0.85,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    });
  }

  if (!hadExtrusion) {
    map.addLayer({
      id: "inst-extrusion",
      type: "fill-extrusion",
      source: "inst-extrusion",
      paint: {
        "fill-extrusion-color": "#e05c2a",
        "fill-extrusion-opacity": 0.85,
        "fill-extrusion-height": [
          "interpolate", ["linear"], ["get", "score"], 0, 40000, 1, 600000,
        ],
        "fill-extrusion-base": 0,
      },
    });
  }

  console.log(
    `[MapGlobe] ensureInstitutionLayers — sources: points=${hadPointsSrc}→${!!map.getSource("inst-points")}, ext=${hadExtSrc}→${!!map.getSource("inst-extrusion")}; layers: circles=${hadCircles}→${!!map.getLayer("inst-circles")}, extrusion=${hadExtrusion}→${!!map.getLayer("inst-extrusion")}`,
  );
}

function applyLayerVisibility(map: maplibregl.Map, globe: boolean) {
  // Show circles always during debugging; extrusion in 3D mode on top.
  const circleVis    = "visible";
  const extrusionVis = globe ? "visible" : "none";
  if (map.getLayer("inst-circles"))   map.setLayoutProperty("inst-circles",   "visibility", circleVis);
  if (map.getLayer("inst-extrusion")) map.setLayoutProperty("inst-extrusion", "visibility", extrusionVis);
  console.log(`[MapGlobe] applyLayerVisibility — globe=${globe}, circles=${circleVis}, extrusion=${extrusionVis}`);
}

function updateSourceData(map: maplibregl.Map, fc: InstitutionFeatureCollection) {
  const pointsSrc = map.getSource("inst-points") as maplibregl.GeoJSONSource | undefined;
  const extSrc    = map.getSource("inst-extrusion") as maplibregl.GeoJSONSource | undefined;
  console.log(`[MapGlobe] updateSourceData — pointsSrc=${!!pointsSrc}, extSrc=${!!extSrc}, features=${fc.features.length}`);
  pointsSrc?.setData(fc);
  extSrc?.setData(toExtrusionFC(fc));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MapGlobe({ compact = false, onInstitutionClick }: MapGlobeProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  // Keep refs in sync so event callbacks always see current values without
  // re-registering listeners.
  const themeRef  = useRef(theme);
  themeRef.current = theme;

  const onInstClickRef = useRef(onInstitutionClick);
  onInstClickRef.current = onInstitutionClick;

  const [isGlobe, setIsGlobe] = useState(true);
  const isGlobeRef = useRef(isGlobe);
  isGlobeRef.current = isGlobe;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track fullscreen state via browser event
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Map initialization — runs once
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

    const applyAll = (evt?: string) => {
      console.log(`[MapGlobe] applyAll triggered by: ${evt ?? "unknown"}, styleLoaded=${map.isStyleLoaded()}`);
      map.setProjection({ type: isGlobeRef.current ? "globe" : "mercator" });
      ensureInstitutionLayers(map);
      applyLayerVisibility(map, isGlobeRef.current);
      scheduleFetch(map);
    };

    // `load` fires on first full render; `style.load` fires on every setStyle
    // (theme swaps). Custom layers are wiped on setStyle, so we re-add them both times.
    map.once("load",       () => applyAll("load"));
    map.on("style.load",   () => applyAll("style.load"));

    // Debounce data updates on camera movement
    map.on("moveend", () => scheduleFetch(map));
    map.on("zoomend", () => scheduleFetch(map));

    // Institution point interaction
    map.on("click", "inst-circles", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      onInstClickRef.current?.({
        id:            String(f.id ?? p.name),
        name:          String(p.name ?? ""),
        workCount:     Number(p.workCount ?? 0),
        citationCount: Number(p.citationCount ?? 0),
        countryCode:   String(p.countryCode ?? ""),
      });
    });
    map.on("mouseenter", "inst-circles", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "inst-circles", () => { map.getCanvas().style.cursor = ""; });

    mapRef.current = map;
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap map style when theme changes (triggers style.load → applyAll).
  // Skip first run — the map was created with the correct style already.
  const themeInitialized = useRef(false);
  useEffect(() => {
    if (!themeInitialized.current) { themeInitialized.current = true; return; }
    mapRef.current?.setStyle(theme === "dark" ? STYLE_DARK : STYLE_LIGHT);
  }, [theme]);

  // Toggle globe/mercator and layer visibility when the projection button is clicked
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
    console.log("[MapGlobe] scheduleFetch queued (debounce 400ms)");
    fetchTimerRef.current = setTimeout(() => doFetch(map), FETCH_DEBOUNCE_MS);
  }

  async function doFetch(map: maplibregl.Map) {
    const bounds = map.getBounds();
    const params = {
      zoom:   map.getZoom(),
      minLng: bounds.getWest()  - BBOX_PAD,
      maxLng: bounds.getEast()  + BBOX_PAD,
      minLat: Math.max(bounds.getSouth() - BBOX_PAD, -90),
      maxLat: Math.min(bounds.getNorth() + BBOX_PAD,  90),
    };
    console.log("[MapGlobe] doFetch params:", params);
    try {
      const fc = await getInstitutionsMap(params);
      console.log("[MapGlobe] API response:", fc.features.length, "features", fc.features[0] ?? "(none)");
      if (mapRef.current === map) {
        updateSourceData(map, fc);
      } else {
        console.warn("[MapGlobe] map instance mismatch — skipping update");
      }
    } catch (err) {
      console.error("[MapGlobe] fetch error", err);
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
      map.getCanvas().toBlob((blob) => {
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
      pitch: 0,
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
