import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "../theme/useTheme";
import "./MapGlobe.css";

const KEY = import.meta.env.VITE_MAPTILER_KEY as string;

const STYLE_LIGHT = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${KEY}`;
const STYLE_DARK  = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`;

type City = { name: string; lat: number; lng: number };

const CITIES: City[] = [
  { name: "New York",        lat: 40.7128,  lng: -74.006   },
  { name: "London",          lat: 51.5074,  lng: -0.1278   },
  { name: "Tokyo",           lat: 35.6762,  lng: 139.6503  },
  { name: "Paris",           lat: 48.8566,  lng: 2.3522    },
  { name: "Berlin",          lat: 52.52,    lng: 13.405    },
  { name: "Sydney",          lat: -33.8688, lng: 151.2093  },
  { name: "São Paulo",       lat: -23.5505, lng: -46.6333  },
  { name: "Shanghai",        lat: 31.2304,  lng: 121.4737  },
  { name: "Mumbai",          lat: 19.076,   lng: 72.8777   },
  { name: "Cairo",           lat: 30.0444,  lng: 31.2357   },
  { name: "Moscow",          lat: 55.7558,  lng: 37.6173   },
  { name: "Beijing",         lat: 39.9042,  lng: 116.4074  },
  { name: "Lagos",           lat: 6.5244,   lng: 3.3792    },
  { name: "Los Angeles",     lat: 34.0522,  lng: -118.2437 },
  { name: "Buenos Aires",    lat: -34.6037, lng: -58.3816  },
  { name: "Istanbul",        lat: 41.0082,  lng: 28.9784   },
  { name: "Mexico City",     lat: 19.4326,  lng: -99.1332  },
  { name: "Seoul",           lat: 37.5665,  lng: 126.978   },
  { name: "Chicago",         lat: 41.8781,  lng: -87.6298  },
  { name: "Jakarta",         lat: -6.2088,  lng: 106.8456  },
  { name: "Bangkok",         lat: 13.7563,  lng: 100.5018  },
  { name: "Nairobi",         lat: -1.2921,  lng: 36.8219   },
  { name: "Singapore",       lat: 1.3521,   lng: 103.8198  },
  { name: "Toronto",         lat: 43.6532,  lng: -79.3832  },
  { name: "Dubai",           lat: 25.2048,  lng: 55.2708   },
  { name: "Madrid",          lat: 40.4168,  lng: -3.7038   },
  { name: "Rome",            lat: 41.9028,  lng: 12.4964   },
  { name: "Amsterdam",       lat: 52.3676,  lng: 4.9041    },
  { name: "Vienna",          lat: 48.2082,  lng: 16.3738   },
  { name: "Warsaw",          lat: 52.2297,  lng: 21.0122   },
  { name: "Prague",          lat: 50.0755,  lng: 14.4378   },
  { name: "Budapest",        lat: 47.4979,  lng: 19.0402   },
  { name: "Johannesburg",    lat: -26.2041, lng: 28.0473   },
  { name: "Cape Town",       lat: -33.9249, lng: 18.4241   },
  { name: "Tehran",          lat: 35.6892,  lng: 51.389    },
  { name: "Riyadh",          lat: 24.7136,  lng: 46.6753   },
  { name: "Kuala Lumpur",    lat: 3.139,    lng: 101.6869  },
  { name: "Manila",          lat: 14.5995,  lng: 120.9842  },
  { name: "Taipei",          lat: 25.033,   lng: 121.5654  },
  { name: "Ho Chi Minh City",lat: 10.8231,  lng: 106.6297  },
  { name: "Bogotá",          lat: 4.711,    lng: -74.0721  },
  { name: "Santiago",        lat: -33.4489, lng: -70.6693  },
  { name: "Lima",            lat: -12.0464, lng: -77.0428  },
  { name: "Karachi",         lat: 24.8607,  lng: 67.0011   },
  { name: "Dhaka",           lat: 23.8103,  lng: 90.4125   },
  { name: "Kinshasa",        lat: -4.4419,  lng: 15.2663   },
  { name: "Casablanca",      lat: 33.5731,  lng: -7.5898   },
  { name: "Zürich",          lat: 47.3769,  lng: 8.5417    },
  { name: "Bratislava",      lat: 48.1486,  lng: 17.1077   },
  { name: "Osaka",           lat: 34.6937,  lng: 135.5023  },
];

const ARCS = [
  { from: [13.405, 52.52],     to: [-74.006, 40.7128]   },
  { from: [-74.006, 40.7128],  to: [139.6503, 35.6762]  },
  { from: [139.6503, 35.6762], to: [151.2093, -33.8688] },
  { from: [151.2093, -33.8688],to: [-46.6333, -23.5505] },
  { from: [-46.6333, -23.5505],to: [13.405, 52.52]      },
];

function citiesGeoJSON() {
  return {
    type: "FeatureCollection" as const,
    features: CITIES.map((c) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
      properties: { name: c.name },
    })),
  };
}

function arcsGeoJSON() {
  return {
    type: "FeatureCollection" as const,
    features: ARCS.map((a) => ({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [a.from, a.to],
      },
      properties: {},
    })),
  };
}

function addLayers(map: maplibregl.Map, isDark: boolean) {
  const dotColor  = isDark ? "#cbf7ed" : "#23395b";
  const textColor = isDark ? "#cbf7ed" : "#23395b";
  const haloColor = isDark ? "rgba(7,16,24,0.6)" : "rgba(255,255,255,0.8)";
  const arcColor  = isDark ? "#8ea8c3" : "#406e8e";

  if (!map.getSource("cities")) {
    map.addSource("cities", { type: "geojson", data: citiesGeoJSON() });
  }
  if (!map.getSource("arcs")) {
    map.addSource("arcs", { type: "geojson", data: arcsGeoJSON() });
  }

  if (!map.getLayer("arcs-line")) {
    map.addLayer({
      id: "arcs-line",
      type: "line",
      source: "arcs",
      paint: {
        "line-color": arcColor,
        "line-width": 1.2,
        "line-opacity": 0.6,
        "line-dasharray": [4, 3],
      },
    });
  }

  if (!map.getLayer("cities-dot")) {
    map.addLayer({
      id: "cities-dot",
      type: "circle",
      source: "cities",
      paint: {
        "circle-radius": 4,
        "circle-color": dotColor,
        "circle-opacity": 0.9,
        "circle-stroke-width": 1,
        "circle-stroke-color": haloColor,
      },
    });
  }

  if (!map.getLayer("cities-label")) {
    map.addLayer({
      id: "cities-label",
      type: "symbol",
      source: "cities",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": 11,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": textColor,
        "text-halo-color": haloColor,
        "text-halo-width": 1,
      },
    });
  }
}

type MapGlobeProps = { compact?: boolean };

export default function MapGlobe({ compact = false }: MapGlobeProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = themeRef.current === "dark";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? STYLE_DARK : STYLE_LIGHT,
      center: [13.405, 30],
      zoom: compact ? 0.6 : 1.5,
      attributionControl: false,
      interactive: !compact,
    });

    if (!compact) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        "top-right",
      );
    }

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      addLayers(map, isDark);
    });

    map.on("style.load", () => {
      addLayers(map, themeRef.current === "dark");
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(theme === "dark" ? STYLE_DARK : STYLE_LIGHT);
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={compact ? "mapGlobe mapGlobeCompact" : "mapGlobe"}
    />
  );
}
