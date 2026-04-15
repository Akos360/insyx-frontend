import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MdMyLocation } from "react-icons/md";
import { BsCamera, BsFullscreen, BsFullscreenExit } from "react-icons/bs";
import { useTheme } from "../../theme/useTheme";
import "./MapGlobe.css";

const KEY = import.meta.env.VITE_MAPTILER_KEY as string;

const STYLE_LIGHT = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${KEY}`;
const STYLE_DARK  = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`;

type MapGlobeProps = { compact?: boolean };

export default function MapGlobe({ compact = false }: MapGlobeProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

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

    const applyProjection = () => {
      map.setProjection({ type: isGlobeRef.current ? "globe" : "mercator" });
    };

    // `load` fires after the first full render — reliable for initial globe setup.
    // `style.load` fires on every setStyle (theme swap) — keeps projection in sync.
    map.once("load", applyProjection);
    map.on("style.load", applyProjection);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(theme === "dark" ? STYLE_DARK : STYLE_LIGHT);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setProjection({ type: isGlobe ? "globe" : "mercator" });
  }, [isGlobe]);

  function handleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current?.requestFullscreen();
    }
  }

  function handleScreenshot() {
    const map = mapRef.current;
    if (!map) return;
    // Capture the canvas inside the render event, before the browser clears
    // the WebGL buffer — avoids needing preserveDrawingBuffer.
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
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
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
      <button
        className="globeBtn globeResetBtn"
        onClick={handleRecenter}
        title="Reset to default view"
      >
        <MdMyLocation size={14} />
      </button>
      {!compact && (
        <>
          <button
            className="globeBtn globeScreenshotBtn"
            onClick={handleScreenshot}
            title="Save screenshot"
          >
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
