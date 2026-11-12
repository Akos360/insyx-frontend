import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { MdMyLocation } from "react-icons/md";
import { BsCamera, BsFullscreen, BsFullscreenExit, BsEye, BsEyeSlash } from "react-icons/bs";
import { useTheme } from "../../theme/useTheme";
import { getInstitutionsMap, type InstitutionFeature, type InstitutionFeatureCollection } from "../../api/works";
import { loadGlobeView, saveGlobeView, DEFAULT_CENTER } from "./globeViewStore";
import "./MapGlobe.css";

// maplibre-gl's worker is two ES modules where the worker imports the shared
// one by relative path — copied verbatim into public/ (scripts/copy-maplibre-worker.mjs)
// so that relative import still resolves, instead of Vite's hashed /assets/ output.
maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}vendor/maplibre/maplibre-gl-worker.mjs`);

const KEY = import.meta.env.VITE_MAPTILER_KEY as string;

const STYLE_LIGHT = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${KEY}`;
const STYLE_DARK  = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`;

// MapTiler's "dataviz" styles (both light and dark) draw country borders —
// source-layer `boundary`, filtered to admin_level 2 — in a near-invisible
// light/dark gray (hsl(220,0%,85%) / hsl(0,0%,30%); checked both style JSONs
// directly) by design, since this basemap is meant to recede behind
// whatever data gets layered on top of it. Reapplied on every style.load,
// same as the institution layers — setStyle recreates the whole style,
// including this one, from scratch each time.
const COUNTRY_BORDER_LAYER_ID = "Country border";

function emphasizeCountryBorders(map: maplibregl.Map, theme: "light" | "dark") {
  if (!map.getLayer(COUNTRY_BORDER_LAYER_ID)) return;
  map.setPaintProperty(COUNTRY_BORDER_LAYER_ID, "line-color", theme === "dark" ? "#cbd5e1" : "#475569");
  map.setPaintProperty(COUNTRY_BORDER_LAYER_ID, "line-opacity", 1);
  // A visibly stronger line at every zoom (was 0.75px zoomed out, up to 8px
  // very close in) — "even when zoomed in at any stage" means the minimum
  // matters as much as the maximum.
  map.setPaintProperty(COUNTRY_BORDER_LAYER_ID, "line-width", [
    "interpolate", ["linear"], ["zoom"],
    1, 1.2,
    4, 1.8,
    8, 3,
    12, 4.5,
    18, 6,
    22, 7.5,
  ] as never);
}

// Degrees of bounding-box padding beyond the visible viewport. Avoids re-fetching
// on small pans — institutions within the padded area are already loaded.
const BBOX_PAD = 10;

// Debounce delay (ms) between the last map movement event and the API fetch.
// Short, now that the backend answers in ~10-40ms instead of 1-2s (see
// WorksService.getScoredInstitutions' in-memory cache) — the old 400ms was
// compensating for a slow server, not smoothing out rapid UI events.
const FETCH_DEBOUNCE_MS = 150;

// ---------------------------------------------------------------------------
// Zoom-responsive sizing
// ---------------------------------------------------------------------------
//
// Every institution is the same width — only color (and, in 3D, height)
// carry the paper/author counts now, both already log-scaled by scale()'s
// log1p so a few mega-institutions don't flatten everyone else to zero. Width
// still has to grow as you zoom in, just identically for every institution,
// not per its own data. For the 2D circle layer this is free: MapLibre's
// `circle-radius` paint property takes a zoom expression and interpolates it
// smoothly on the GPU, with no refetch. The 3D footprint can't do that (its
// circle is baked into polygon geometry, not a paint property), so its
// degree-radius is instead recomputed from the *current* zoom every time new
// data arrives (which already happens on every zoomend) — not continuously
// smooth mid-gesture, but correctly sized once you stop. Both read the same
// [zoom, px] stops so a given zoom looks the same size in either mode.
const RADIUS_PX_STOPS: Array<[zoom: number, px: number]> = [
  [1, 3],
  [4, 4.5],
  [7, 6],
  [10, 9],
  [14, 13],
  [18, 20],
];

function radiusPxAt(zoom: number): number {
  const stops = RADIUS_PX_STOPS;
  for (let i = 0; i < stops.length - 1; i++) {
    const [z0, px0] = stops[i];
    const [z1, px1] = stops[i + 1];
    if (zoom >= z0 && zoom <= z1) {
      const t = z1 === z0 ? 0 : (zoom - z0) / (z1 - z0);
      return px0 + t * (px1 - px0);
    }
  }
  return zoom < stops[0][0] ? stops[0][1] : stops[stops.length - 1][1];
}

// Mirrors radiusPxAt() as a plain MapLibre zoom expression — no per-feature
// property involved now that every institution is the same width.
function radiusExpr(): unknown[] {
  const expr: unknown[] = ["interpolate", ["linear"], ["zoom"]];
  for (const [zoom, px] of RADIUS_PX_STOPS) expr.push(zoom, px);
  return expr;
}

// A Web Mercator-style meters-per-pixel conversion — used to translate a
// target pixel size (ground radius *or* pillar height, see below) into the
// real-world meters MapLibre's geometry/paint properties actually take.
function metersPerPixelAt(lat: number, zoom: number): number {
  return (156_543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

// Converts radiusPxAt()'s target pixel size into the degree radius
// circleRing() needs — the circle itself is still drawn in plain lng/lat
// space (not geo-correct at high latitudes), matching circleRing()'s
// existing simplification.
function footprintRadiusDeg(radiusPx: number, lat: number, zoom: number): number {
  return (radiusPx * metersPerPixelAt(lat, zoom)) / 111_320; // meters per degree of latitude
}

// Pillar height, as a target pixel size per zoom (min..max, picked by
// worksNorm) — same shape and reasoning as RADIUS_PX_STOPS, just taller, so
// a pillar is always clearly visible above its footprint. Converted to real
// meters via metersPerPixelAt() at fetch time (toExtrusionFC), exactly like
// the footprint radius, rather than scaled live by a zoom factor as before.
//
// That's a deliberate fix, not just a style choice: a camera's altitude
// above the ground is itself roughly proportional to metersPerPixelAt() (it
// has to be, for the ground to fill the screen at a given zoom) — so tying
// height to the same conversion keeps every pillar a small, bounded fraction
// of the camera's altitude at any zoom, by construction. The old design held
// height in large, fixed real-world meters (up to ~450km) and then made it
// *grow* with zoom on top of that — at high zoom the camera's altitude
// shrinks to a few dozen meters while the pillar stayed enormous, so panning
// to center a tall pillar put the camera inside or past its geometry,
// where fill-extrusion gets near-plane clipped or back-face-culled away
// entirely — the reported "pillar disappears" bug.
const HEIGHT_PX_STOPS: Array<[zoom: number, pxMin: number, pxMax: number]> = [
  [1, 4, 10],
  [4, 6, 16],
  [7, 9, 24],
  [10, 14, 38],
  [14, 20, 56],
  [18, 28, 78],
];

function heightPxAt(zoom: number, norm: number): number {
  const stops = HEIGHT_PX_STOPS;
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (zoom >= stops[i][0] && zoom <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  if (zoom <= stops[0][0]) hi = lo;
  if (zoom >= stops[stops.length - 1][0]) lo = hi;
  const t = hi[0] === lo[0] ? 0 : (zoom - lo[0]) / (hi[0] - lo[0]);
  const pxMin = lo[1] + t * (hi[1] - lo[1]);
  const pxMax = lo[2] + t * (hi[2] - lo[2]);
  return pxMin + norm * (pxMax - pxMin);
}

// ---------------------------------------------------------------------------
// Color — now the *only* thing that tells institutions apart by size (every
// footprint is the same width — see RADIUS_PX_STOPS above). A smooth
// multi-stop gradient over colorNorm, a 0..1 blend of an institution's work
// count and author count (each already log1p-scaled by scale(), so a handful
// of mega-institutions don't flatten everyone else to the palest shade), not
// citation impact. MapLibre's `interpolate` renders every in-between value as
// its own exact shade, not a jump between a few buckets.
// ---------------------------------------------------------------------------
const COLOR_STOPS: Array<[t: number, color: string]> = [
  [0,    "#1e3a8a"],
  [0.15, "#2563eb"],
  [0.3,  "#0ea5e9"],
  [0.45, "#10b981"],
  [0.6,  "#84cc16"],
  [0.75, "#f59e0b"],
  [0.9,  "#f97316"],
  [1,    "#dc2626"],
];

function colorExpr(propertyName: string): unknown[] {
  const expr: unknown[] = ["interpolate", ["linear"], ["get", propertyName]];
  for (const [t, color] of COLOR_STOPS) expr.push(t, color);
  return expr;
}

// Institutions are drawn a bit transparent in both modes so they don't fully
// obscure the map underneath them.
const INSTITUTION_OPACITY = 0.62;

// The globe projection's rendered diameter is 512 * 2^zoom / PI pixels — fixed
// by zoom alone, independent of the container's own width/height. A single
// hardcoded zoom can't fit both the short compact preview card and the large
// full /globe page without cropping one of them (the compact card's ~180px
// height is far shorter than the ~460px diameter the old zoom=1.5 default
// produced). Computing zoom from the container's own measured box instead
// guarantees the whole sphere is visible and centered, in any container.
const GLOBE_FILL_FRACTION = 0.82; // sphere diameter as a fraction of the smaller container dimension
const GLOBE_FIT_MIN_ZOOM = 0;
const GLOBE_FIT_MAX_ZOOM = 3;

function fitZoomToContainer(widthPx: number, heightPx: number): number {
  const sizePx = Math.min(widthPx, heightPx);
  if (!(sizePx > 0)) return GLOBE_FIT_MIN_ZOOM;
  const diameterPx = sizePx * GLOBE_FILL_FRACTION;
  const zoom = Math.log2((diameterPx * Math.PI) / 512);
  return Math.min(Math.max(zoom, GLOBE_FIT_MIN_ZOOM), GLOBE_FIT_MAX_ZOOM);
}

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

// 48, not the original 24 — at 24 sides a pillar's footprint reads as a
// decagon-ish polygon rather than a circle, especially once the globe's
// curvature distorts its vertices.
const CIRCLE_STEPS = 48;

function circleRing(lat: number, lng: number, radiusDeg: number): number[][] {
  // A plain circle in lng/lat space (not geo-correct at high latitudes, but
  // visually fine at the zoom levels these bars are actually shown at).
  const ring: number[][] = [];
  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    const theta = (i / CIRCLE_STEPS) * 2 * Math.PI;
    ring.push([lng + radiusDeg * Math.cos(theta), lat + radiusDeg * Math.sin(theta)]);
  }
  return ring;
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

// worksNorm (0..1, log1p-scaled from the work count relative to the biggest
// one currently on screen — see scale()) drives 3D pillar height; colorNorm
// (its average with the equivalent authors-based norm) drives color in both
// modes. Width no longer varies per institution at all (see RADIUS_PX_STOPS),
// so there's no "radiusNorm" any more. Computed once per fetch here.
// maxAuthors/maxWorks are returned too so the on-screen legend can show real
// counts for "what does big mean right now" instead of just an abstract 0..1
// scale.
function withNorms<T extends { properties: { authorCount: number; workCount: number } }>(
  features: T[],
): { features: Array<T & { worksNorm: number; colorNorm: number }>; maxAuthors: number; maxWorks: number } {
  const maxAuthors = features.reduce((m, f) => Math.max(m, f.properties.authorCount), 0);
  const maxWorks   = features.reduce((m, f) => Math.max(m, f.properties.workCount), 0);
  const annotated = features.map((f) => {
    const authorsNorm = scale(f.properties.authorCount, maxAuthors, 0, 1);
    const worksNorm   = scale(f.properties.workCount, maxWorks, 0, 1);
    return { ...f, worksNorm, colorNorm: (authorsNorm + worksNorm) / 2 };
  });
  return { features: annotated, maxAuthors, maxWorks };
}

type AnnotatedInstitutionFeature = ReturnType<typeof withNorms<InstitutionFeature>>["features"][number];

// 2D: plain points: the `circle` layer sizes/colors them entirely through
// paint expressions (radiusExpr/colorExpr), so no geometry work is needed
// here — just attaching the normalized value each one reads.
function toPointFC(annotated: AnnotatedInstitutionFeature[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: annotated.map((f): Feature<Point> => ({
      type: "Feature",
      id: f.id,
      geometry: f.geometry,
      properties: { ...f.properties, colorNorm: f.colorNorm, id: f.id },
    })),
  };
}

// 3D: footprint polygons, every one the same width at a given zoom (see
// RADIUS_PX_STOPS), plus a height in meters converted from a target pixel
// size (see HEIGHT_PX_STOPS) the same way the footprint radius is — both
// recomputed from the *current* zoom every time new data arrives.
function toExtrusionFC(annotated: AnnotatedInstitutionFeature[], zoom: number): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: annotated.map((f): Feature<Polygon> => {
      const [lng, lat] = f.geometry.coordinates;
      const radiusDeg = footprintRadiusDeg(radiusPxAt(zoom), lat, zoom);
      const height = heightPxAt(zoom, f.worksNorm) * metersPerPixelAt(lat, zoom);
      return {
        type: "Feature",
        id: f.id,
        geometry: { type: "Polygon", coordinates: [circleRing(lat, lng, radiusDeg)] },
        // `id` duplicated into properties: MapLibre GL doesn't reliably
        // preserve a non-numeric string as the top-level GeoJSON feature id
        // on click events for a plain geojson source (no promoteId/generateId
        // configured) — `e.features[0].id` comes back as an internal numeric
        // index instead. Properties are untouched by MapLibre, so reading the
        // real id from there on click is the reliable path.
        properties: { ...f.properties, height, colorNorm: f.colorNorm, id: f.id },
      };
    }),
  };
}

const EMPTY_POINT_FC: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };
const EMPTY_POLY_FC: FeatureCollection<Polygon> = { type: "FeatureCollection", features: [] };

// ---------------------------------------------------------------------------
// Layer management
// ---------------------------------------------------------------------------

// Clicks/hover always resolve against inst-circle alone — see
// syncInstitutionLayers for why.
const HIT_TEST_LAYER_IDS = ["inst-circle"];

function ensureLayers(map: maplibregl.Map) {
  if (!map.getSource("inst-points")) {
    map.addSource("inst-points", { type: "geojson", data: EMPTY_POINT_FC });
  }
  if (!map.getSource("inst-extrusion")) {
    map.addSource("inst-extrusion", { type: "geojson", data: EMPTY_POLY_FC });
  }

  // 2D — a native circle layer: `circle-radius` takes a zoom expression and
  // resizes smoothly on the GPU as you zoom, with no refetch and no visible
  // height (institutions don't need to look 3D when the map itself is flat).
  // Also doubles as the click/hover hit target in 3D (made fully transparent
  // there instead of hidden) — see syncInstitutionLayers.
  if (!map.getLayer("inst-circle")) {
    map.addLayer({
      id: "inst-circle",
      type: "circle",
      source: "inst-points",
      paint: {
        "circle-radius": radiusExpr() as never,
        "circle-color": colorExpr("colorNorm") as never,
        "circle-opacity": INSTITUTION_OPACITY,
        "circle-stroke-width": 0.6,
        "circle-stroke-color": "rgba(0,0,0,0.25)",
        "circle-stroke-opacity": 1,
      },
    });
  }

  // 3D — the extruded pillars, visible only in globe mode (see
  // syncInstitutionLayers). Visual only — never queried for clicks (see
  // HIT_TEST_LAYER_IDS).
  if (!map.getLayer("inst-extrusion")) {
    map.addLayer({
      id: "inst-extrusion",
      type: "fill-extrusion",
      source: "inst-extrusion",
      paint: {
        "fill-extrusion-color": colorExpr("colorNorm") as never,
        "fill-extrusion-opacity": INSTITUTION_OPACITY,
        // Already computed in real meters per the current zoom (see
        // toExtrusionFC/HEIGHT_PX_STOPS) — no zoom expression needed here.
        "fill-extrusion-height": ["get", "height"] as never,
        "fill-extrusion-base": 0,
      },
    });
  }
}

// Institutions are plotted at their own coordinate (real once the lakehouse
// has it, a generated-but-within-country placeholder until then — see
// institution-coords.seed.json on the backend). Flat circles in 2D
// (mercator), extruded pillars in 3D (globe) — both gated by the eye
// button's showInstitutions.
//
// inst-circle stays mounted (visibility: visible) in 3D too, just fully
// transparent (opacity 0) rather than hidden — MapLibre excludes
// `visibility: none` layers from queryRenderedFeatures entirely, so hiding
// it the usual way would make it unclickable. This is deliberate: under
// globe projection, a fill-extrusion pillar's visible, rendered shape leans
// outward from the view's center with the sphere's curvature, but its click
// hit-test only ever considers the flat, un-leaned footprint — the two
// diverge more the further a pillar sits from center, i.e. the more of the
// globe you can see at once, which is exactly "zoomed out" and matches the
// reported can't-click symptom. inst-circle has no height/lean to begin
// with, so its render and hit-test positions never diverge — a reliable,
// invisible stand-in for whatever's rendered above it.
function syncInstitutionLayers(map: maplibregl.Map, isGlobe: boolean, showInstitutions: boolean) {
  if (map.getLayer("inst-circle")) {
    map.setLayoutProperty("inst-circle", "visibility", showInstitutions ? "visible" : "none");
    map.setPaintProperty("inst-circle", "circle-opacity", isGlobe ? 0 : INSTITUTION_OPACITY);
    map.setPaintProperty("inst-circle", "circle-stroke-opacity", isGlobe ? 0 : 1);
  }
  if (map.getLayer("inst-extrusion")) {
    map.setLayoutProperty("inst-extrusion", "visibility", showInstitutions && isGlobe ? "visible" : "none");
  }
}

// A CSS-side mirror of COLOR_STOPS, for the legend's gradient swatch —
// MapLibre's expression and this `linear-gradient` need to list the same
// stops, just in each side's own syntax.
const COLOR_GRADIENT_CSS = `linear-gradient(90deg, ${COLOR_STOPS.map(([t, c]) => `${c} ${t * 100}%`).join(", ")})`;

// Short, always-on explanation of what color/height encode — every
// institution is the same width now (see RADIUS_PX_STOPS); only color (a
// log-scaled blend of paper + author counts) and, in 3D, pillar height
// (log-scaled paper count) tell them apart. The live max counts answer "big
// compared to what": the largest institution in the current view.
function InstitutionLegend({ isGlobe, maxAuthors, maxWorks }: { isGlobe: boolean; maxAuthors: number; maxWorks: number }) {
  return (
    <div className="globeLegend">
      <div className="globeLegendRow">
        <span className="globeLegendSwatch" style={{ background: COLOR_GRADIENT_CSS }} />
        <span className="globeLegendText">darker = more papers &amp; authors (log scale)</span>
      </div>
      {isGlobe && (
        <div className="globeLegendRow">
          <span className="globeLegendHeightBars">
            <span className="globeLegendBar globeLegendBarSm" />
            <span className="globeLegendBar globeLegendBarMd" />
            <span className="globeLegendBar globeLegendBarLg" />
          </span>
          <span className="globeLegendText">taller = more papers (log scale)</span>
        </div>
      )}
      {(maxAuthors > 0 || maxWorks > 0) && (
        <div className="globeLegendRange">
          largest here: {maxWorks.toLocaleString()} papers · {maxAuthors.toLocaleString()} authors
        </div>
      )}
    </div>
  );
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

  // Seeded once from the last-saved camera state (or today's hardcoded
  // defaults on first-ever use) so the globe reopens where it was left,
  // instead of always resetting — see globeViewStore.ts.
  const initialViewRef = useRef<ReturnType<typeof loadGlobeView> | null>(null);
  if (initialViewRef.current === null) initialViewRef.current = loadGlobeView(compact);
  const initialView = initialViewRef.current;

  const [isGlobe, setIsGlobe] = useState(initialView.isGlobe);
  const isGlobeRef = useRef(isGlobe);
  isGlobeRef.current = isGlobe;

  const [showInstitutions, setShowInstitutions] = useState(initialView.showInstitutions);
  const showInstitutionsRef = useRef(showInstitutions);
  showInstitutionsRef.current = showInstitutions;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The largest author/work count currently on screen — drives the legend's
  // "what does big mean right now" numbers (see withNorms).
  const [legendStats, setLegendStats] = useState({ maxAuthors: 0, maxWorks: 0 });

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const { clientWidth, clientHeight } = containerRef.current;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: themeRef.current === "dark" ? STYLE_DARK : STYLE_LIGHT,
      center: initialView.center,
      zoom: fitZoomToContainer(clientWidth, clientHeight),
      pitch: initialView.pitch,
      bearing: initialView.bearing,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right",
    );

    const applyAll = () => {
      map.setProjection({ type: isGlobeRef.current ? "globe" : "mercator" });
      ensureLayers(map);
      syncInstitutionLayers(map, isGlobeRef.current, showInstitutionsRef.current);
      emphasizeCountryBorders(map, themeRef.current);
      scheduleFetch(map);
    };

    // `load` fires on first full render; `style.load` fires on every setStyle
    // (theme swaps). Custom layers are wiped on setStyle, so we re-add them both times.
    map.once("load",     applyAll);
    map.on("style.load", applyAll);

    // Debounce institution-bar data updates on camera movement.
    map.on("moveend", () => scheduleFetch(map));
    map.on("zoomend", () => scheduleFetch(map));

    // Persist the camera on every change so the globe reopens here next time
    // (see globeViewStore.ts) — fires on manual interaction and equally on
    // the Recenter button's flyTo(), so a subsequent nav-away-and-back keeps
    // the recentered view rather than the one from before Recenter was clicked.
    const persistCamera = () => {
      saveGlobeView({
        center: map.getCenter().toArray() as [number, number],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      });
    };
    map.on("moveend", persistCamera);
    map.on("zoomend", persistCamera);
    map.on("pitchend", persistCamera);
    map.on("rotateend", persistCamera);

    // A small box around the cursor, not a single pixel — forgiving for
    // small/thin targets generally, on top of the inst-circle hit-testing
    // trick in syncInstitutionLayers (which is what actually fixes clicking
    // 3D pillars).
    const CLICK_HIT_PADDING_PX = 6;

    function institutionAt(point: maplibregl.Point): maplibregl.MapGeoJSONFeature | undefined {
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - CLICK_HIT_PADDING_PX, point.y - CLICK_HIT_PADDING_PX],
        [point.x + CLICK_HIT_PADDING_PX, point.y + CLICK_HIT_PADDING_PX],
      ];
      return map.queryRenderedFeatures(box, { layers: HIT_TEST_LAYER_IDS })[0];
    }

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      const f = institutionAt(e.point);
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      onInstClickRef.current?.({
        id:            String(p.id ?? f.id ?? p.name),
        name:          String(p.name ?? ""),
        workCount:     Number(p.workCount ?? 0),
        authorCount:   Number(p.authorCount ?? 0),
        citationCount: Number(p.citationCount ?? 0),
        countryCode:   String(p.countryCode ?? ""),
      });
    });
    map.on("mousemove", (e: maplibregl.MapMouseEvent) => {
      map.getCanvas().style.cursor = institutionAt(e.point) ? "pointer" : "";
    });

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
    saveGlobeView({ isGlobe });
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setProjection({ type: isGlobe ? "globe" : "mercator" });
    syncInstitutionLayers(map, isGlobe, showInstitutionsRef.current);
  }, [isGlobe]);

  useEffect(() => {
    saveGlobeView({ showInstitutions });
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncInstitutionLayers(map, isGlobeRef.current, showInstitutions);
  }, [showInstitutions]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  function scheduleFetch(map: maplibregl.Map) {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => doFetchInstitutions(map), FETCH_DEBOUNCE_MS);
  }

  async function doFetchInstitutions(map: maplibregl.Map) {
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    try {
      const fc: InstitutionFeatureCollection = await getInstitutionsMap({
        zoom,
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
      // Both sources are kept populated regardless of which layer is
      // currently visible, so toggling 2D/3D is instant and never waits on
      // a refetch.
      const { features: annotated, maxAuthors, maxWorks } = withNorms(fc.features);
      const pointSrc = map.getSource("inst-points") as maplibregl.GeoJSONSource | undefined;
      const polySrc  = map.getSource("inst-extrusion") as maplibregl.GeoJSONSource | undefined;
      pointSrc?.setData(toPointFC(annotated));
      polySrc?.setData(toExtrusionFC(annotated, zoom));
      setLegendStats({ maxAuthors, maxWorks });
    } catch (err) {
      console.error("[MapGlobe] institutions fetch error", err);
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
    const map = mapRef.current;
    if (!map) return;
    const { clientWidth, clientHeight } = map.getContainer();
    map.flyTo({
      center: DEFAULT_CENTER,
      zoom: fitZoomToContainer(clientWidth, clientHeight),
      bearing: 0,
      // Flat, not tilted — a nonzero pitch skews the camera off the sphere's
      // center, pushing the visible hemisphere down and cropping its top edge
      // (the "whole globe pushed down" bug). Matches the flat default view.
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
      <button
        className="globeBtn globeInstitutionsToggleBtn"
        onClick={() => setShowInstitutions((s) => !s)}
        title={showInstitutions ? "Hide institutions" : "Show institutions"}
      >
        {showInstitutions ? <BsEye size={14} /> : <BsEyeSlash size={14} />}
      </button>
      {!compact && showInstitutions && (
        <InstitutionLegend isGlobe={isGlobe} maxAuthors={legendStats.maxAuthors} maxWorks={legendStats.maxWorks} />
      )}
    </div>
  );
}
