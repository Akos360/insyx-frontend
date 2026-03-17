import GlobeScene from "../components/GlobeScene";
import { useTheme } from "../theme/useTheme";
import "./globe-page.css";

export default function GlobePage() {
  const { theme } = useTheme();
  const panelTone = theme === "light" ? "Daylight network" : "Night network";

  return (
    <main className="globePage">
      <section className="globePageCard">
        <div className="globePageHeader">
          <div>
            <p className="globePageEyebrow">Globe</p>
          </div>
          <p className="globePageSummary">
            Interactive globe powered by Three.js via Globe.gl, ready for markers, routes, and data overlays.
          </p>
        </div>

        <div className="globePageContent">
          <GlobeScene />

          <aside className="globePageSidebar">
            <div className="globePageBlock globePageBlockLarge">
              <span className="globePageBlockLabel">Renderer</span>
              <strong>Three.js + Globe.gl</strong>
              <p>Responsive canvas sized to the card container so it fits your existing app shell.</p>
            </div>
            <div className="globePageBlock">
              <span className="globePageBlockLabel">Theme</span>
              <strong>{panelTone}</strong>
              <p>The globe texture and atmosphere shift with the app theme.</p>
            </div>
            <div className="globePageBlock">
              <span className="globePageBlockLabel">Data</span>
              <strong>5 points, 5 routes</strong>
              <p>Replace the demo nodes with API data when you are ready.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
