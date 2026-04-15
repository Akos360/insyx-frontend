import { Suspense, lazy } from "react";
import "./globe-page.css";

const MapGlobe = lazy(() => import("../../components/globe/MapGlobe"));

export default function GlobePage() {
  return (
    <div className="globePage">
      <Suspense fallback={<div className="globePageFallback" />}>
        <MapGlobe />
      </Suspense>
    </div>
  );
}
