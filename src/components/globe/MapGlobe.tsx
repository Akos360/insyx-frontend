import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MdMyLocation } from "react-icons/md";
import { BsCamera, BsFullscreen, BsFullscreenExit } from "react-icons/bs";
import { useTheme } from "../../theme/useTheme";
import "./MapGlobe.css";

// maplibre-gl's worker is two ES modules where the worker imports the shared
// one by relative path — copied verbatim into public/ (scripts/copy-maplibre-worker.mjs)
// so that relative import still resolves, instead of Vite's hashed /assets/ output.
maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}vendor/maplibre/maplibre-gl-worker.mjs`);

const KEY = import.meta.env.VITE_MAPTILER_KEY as string;

const STYLE_LIGHT = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${KEY}`;
const STYLE_DARK  = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`;

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

    // `style.load` also fires on setStyle (theme swap), so re-apply the projection both times.
    const applyProjection = () => map.setProjection({ type: isGlobeRef.current ? "globe" : "mercator" });
    map.once("load",     applyProjection);
    map.on("style.load", applyProjection);

    mapRef.current = map;
    return () => {
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
  }, [isGlobe]);

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
