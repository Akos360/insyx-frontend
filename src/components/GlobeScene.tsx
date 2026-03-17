import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { useTheme } from "../theme/useTheme";
import bumpTexture from "../assets/globe/earth-topology.png";
import dayTexture from "../assets/globe/earth-blue-marble.jpg";
import nightTexture from "../assets/globe/earth-night.jpg";
import starField from "../assets/globe/night-sky.png";

type GlobePoint = {
  name: string;
  lat: number;
  lng: number;
  size: number;
};

type GlobeArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

type GlobeSceneProps = {
  compact?: boolean;
};

const points: GlobePoint[] = [
  { name: "Berlin", lat: 52.52, lng: 13.405, size: 0.34 },
  { name: "New York", lat: 40.7128, lng: -74.006, size: 0.38 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, size: 0.32 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, size: 0.3 },
  { name: "Sao Paulo", lat: -23.5505, lng: -46.6333, size: 0.28 },
];

const arcs: GlobeArc[] = [
  { startLat: 52.52, startLng: 13.405, endLat: 40.7128, endLng: -74.006 },
  { startLat: 40.7128, startLng: -74.006, endLat: 35.6762, endLng: 139.6503 },
  { startLat: 35.6762, startLng: 139.6503, endLat: -33.8688, endLng: 151.2093 },
  { startLat: -33.8688, startLng: 151.2093, endLat: -23.5505, endLng: -46.6333 },
  { startLat: -23.5505, startLng: -46.6333, endLat: 52.52, endLng: 13.405 },
];

export default function GlobeScene({ compact = false }: GlobeSceneProps) {
  const { theme } = useTheme();
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      setGlobeSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const globeTheme = useMemo(
    () =>
      theme === "light"
        ? {
            atmosphereColor: "#406e8e",
            backgroundColor: "rgba(247, 251, 255, 0)",
            globeImageUrl: dayTexture,
            pointsColor: "#23395b",
            arcColor: ["#23395b", "#8ea8c3"] as [string, string],
            panelTone: "Daylight network",
          }
        : {
            atmosphereColor: "#cbf7ed",
            backgroundColor: "rgba(7, 16, 24, 0)",
            globeImageUrl: nightTexture,
            pointsColor: "#cbf7ed",
            arcColor: ["#8ea8c3", "#cbf7ed"] as [string, string],
            panelTone: "Night network",
          },
    [theme],
  );

  const globeReady = globeSize.width > 0 && globeSize.height > 0;

  return (
    <div ref={globeContainerRef} className={compact ? "globeViewport globeViewportCompact" : "globeViewport"}>
      {globeReady ? (
        <Globe
          width={globeSize.width}
          height={globeSize.height}
          backgroundColor={globeTheme.backgroundColor}
          backgroundImageUrl={theme === "dark" ? starField : undefined}
          globeImageUrl={globeTheme.globeImageUrl}
          bumpImageUrl={bumpTexture}
          showAtmosphere
          atmosphereColor={globeTheme.atmosphereColor}
          atmosphereAltitude={compact ? 0.14 : 0.18}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="size"
          pointRadius={compact ? 0.45 : 0.55}
          pointColor={() => globeTheme.pointsColor}
          pointLabel="name"
          arcsData={arcs}
          arcColor={() => globeTheme.arcColor}
          arcAltitude={compact ? 0.12 : 0.18}
          arcStroke={compact ? 0.5 : 0.7}
          arcDashLength={0.6}
          arcDashGap={0.2}
          arcDashAnimateTime={1800}
        />
      ) : (
        <div className="globeFallback">Preparing globe renderer...</div>
      )}
    </div>
  );
}
