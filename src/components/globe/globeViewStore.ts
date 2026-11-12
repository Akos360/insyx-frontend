const STORAGE_KEY = "app-globe-view";

// Central Europe (around Austria/southern Germany) — the default facing point,
// shared with MapGlobe's Recenter button so the two never drift apart.
export const DEFAULT_CENTER: [number, number] = [15, 48];

export interface GlobeView {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  isGlobe: boolean;
  showInstitutions: boolean;
}

function defaultView(compact: boolean): GlobeView {
  return {
    center: DEFAULT_CENTER,
    // Placeholder only — MapGlobe replaces this at mount with a zoom computed
    // from the container's actual size (see fitZoomToContainer), since a fixed
    // number can't fit both the short preview card and the full /globe page at
    // once. Kept here just so GlobeView always has a well-typed zoom value.
    zoom: compact ? 1.2 : 1.5,
    // Flat, not tilted: the original Map constructor never set an initial
    // pitch (MapLibre defaults to 0) — only the Recenter button's flyTo
    // ever applied 45deg. A never-visited globe must open flat/centered,
    // the same look the app always had before this store existed.
    pitch: 0,
    bearing: 0,
    isGlobe: true,
    showInstitutions: true,
  };
}

function isGlobeView(value: unknown): value is GlobeView {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.center) && v.center.length === 2 &&
    typeof v.center[0] === "number" && typeof v.center[1] === "number" &&
    typeof v.zoom === "number" &&
    typeof v.pitch === "number" &&
    typeof v.bearing === "number" &&
    typeof v.isGlobe === "boolean" &&
    typeof v.showInstitutions === "boolean"
  );
}

export function loadGlobeView(compact: boolean): GlobeView {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultView(compact);
    const parsed = JSON.parse(raw);
    return isGlobeView(parsed) ? parsed : defaultView(compact);
  } catch {
    return defaultView(compact);
  }
}

export function saveGlobeView(patch: Partial<GlobeView>): void {
  try {
    const next = { ...loadGlobeView(false), ...patch };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage disabled/blocked/quota exceeded — persistence is a nice-to-have, never fatal.
  }
}
