import MapGlobe from "../components/MapGlobe";
import "./globe-page.css";

const points = [
  { name: "Berlin",    lat: 52.52,   lng: 13.405,   size: 0.9  },
  { name: "New York",  lat: 40.7128, lng: -74.006,  size: 0.38 },
  { name: "Tokyo",     lat: 35.6762, lng: 139.6503, size: 0.32 },
  { name: "Sydney",    lat: -33.8688,lng: 151.2093, size: 0.3  },
  { name: "Sao Paulo", lat: -23.5505,lng: -46.6333, size: 0.28 },
];

const routes = [
  { from: "Berlin",    to: "New York"  },
  { from: "New York",  to: "Tokyo"     },
  { from: "Tokyo",     to: "Sydney"    },
  { from: "Sydney",    to: "Sao Paulo" },
  { from: "Sao Paulo", to: "Berlin"    },
];

export default function GlobePage() {
  return (
    <main className="globePage">
      <section className="globePageCard">
        <div className="globePageContent">
          <MapGlobe />

          <aside className="globePageSidebar">
            <div className="globePageBlock">
              <span className="globePageBlockLabel">Points</span>
              <ul className="globeDataList">
                {points.map((p) => (
                  <li key={p.name} className="globeDataItem">
                    <span className="globeDataName">{p.name}</span>
                    <span className="globeDataMeta">
                      {p.lat.toFixed(2)}, {p.lng.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="globePageBlock">
              <span className="globePageBlockLabel">Routes</span>
              <ul className="globeDataList">
                {routes.map((r) => (
                  <li key={r.from + r.to} className="globeDataItem">
                    <span className="globeDataName">{r.from}</span>
                    <span className="globeDataArrow">→</span>
                    <span className="globeDataName">{r.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}