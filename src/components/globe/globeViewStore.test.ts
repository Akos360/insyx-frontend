import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadGlobeView, saveGlobeView, type GlobeView } from "./globeViewStore";

describe("globeViewStore", () => {
  beforeEach(() => window.localStorage.clear());

  it("returns the compact default zoom (1.2) when nothing is stored and compact=true", () => {
    expect(loadGlobeView(true)).toEqual({
      center: [15, 48], zoom: 1.2, pitch: 0, bearing: 0, isGlobe: true, showInstitutions: true,
    });
  });

  it("defaults to a flat pitch (0), not tilted — the pre-existing Map constructor never set an initial pitch, so a never-visited globe must open flat/centered, matching the look before this store existed, not match Recenter's own tilted 45deg", () => {
    expect(loadGlobeView(false).pitch).toBe(0);
  });

  it("returns the full default zoom (1.5) when nothing is stored and compact=false", () => {
    expect(loadGlobeView(false).zoom).toBe(1.5);
  });

  it("round-trips a saved view regardless of the compact flag passed to loadGlobeView", () => {
    saveGlobeView({ center: [10, 20], zoom: 6, pitch: 0, bearing: 30, isGlobe: false, showInstitutions: false });
    const view: GlobeView = loadGlobeView(true);
    expect(view).toEqual({ center: [10, 20], zoom: 6, pitch: 0, bearing: 30, isGlobe: false, showInstitutions: false });
  });

  it("merges a partial patch onto the existing stored view instead of replacing it", () => {
    saveGlobeView({ center: [10, 20], zoom: 6, pitch: 0, bearing: 30, isGlobe: false, showInstitutions: false });
    saveGlobeView({ zoom: 9 });
    expect(loadGlobeView(false)).toMatchObject({ center: [10, 20], zoom: 9, showInstitutions: false });
  });

  it("falls back cleanly instead of throwing when the stored value is corrupt JSON", () => {
    window.localStorage.setItem("app-globe-view", "{not json");
    expect(() => loadGlobeView(false)).not.toThrow();
    expect(loadGlobeView(false).zoom).toBe(1.5);
  });

  it("does not throw when localStorage.setItem throws (e.g. storage disabled/quota exceeded)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => saveGlobeView({ zoom: 3 })).not.toThrow();
    spy.mockRestore();
  });
});
