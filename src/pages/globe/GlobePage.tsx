import { Suspense, lazy, useState } from "react";
import GlobePanel from "../../components/globe/GlobePanel";
import type { ClickedInstitution } from "../../components/globe/MapGlobe";
import "./globe-page.css";

const MapGlobe = lazy(() => import("../../components/globe/MapGlobe"));

export default function GlobePage() {
  const [isPanelOpen, setIsPanelOpen]             = useState(false);
  const [clickedInstitution, setClickedInstitution] = useState<ClickedInstitution | null>(null);

  function handleInstitutionClick(inst: ClickedInstitution) {
    setClickedInstitution(inst);
    setIsPanelOpen(true);
  }

  function handlePanelClose() {
    setIsPanelOpen(false);
  }

  return (
    <div className="globePage">
      <div className="globeMapArea">
        <Suspense fallback={<div className="globePageFallback" />}>
          <MapGlobe onInstitutionClick={handleInstitutionClick} />
        </Suspense>
      </div>

      {/* Tab button — visible when panel is closed */}
      <button
        className={`globePanelTab${isPanelOpen ? " globePanelTabHidden" : ""}`}
        onClick={() => setIsPanelOpen(true)}
        title="Open explorer panel"
      >
        ‹
      </button>

      <GlobePanel
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        clickedInstitution={clickedInstitution}
      />
    </div>
  );
}
