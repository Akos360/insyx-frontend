import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import "./explore.css";
import { BsArrowsAngleExpand } from "react-icons/bs";

const GlobeScene = lazy(() => import("../components/GlobeScene"));

const sections = [
  { id: "panel-1", label: "Search", to: "/search" },
  { id: "panel-2", label: "Explore Net", to: "/explore-net" },
  { id: "panel-3", label: "Paper", to: "/paper" },
  { id: "panel-4", label: "Globe", to: "/globe" },
];

export default function ExplorePage() {
  return (
    <main className="exploreRoot">
      <div className="exploreGrid">
        {sections.map((section) => (
          <div
            key={section.id}
            className={section.to === "/globe" ? "exploreCard exploreCardGlobe" : "exploreCard"}
          >
            {section.to === "/globe" ? (
              <Suspense fallback={<div className="exploreCardGlobeFallback" />}>
                <div className="exploreCardGlobePreview">
                  <GlobeScene compact />
                </div>
              </Suspense>
            ) : (
              <span className="exploreCardLabel">{section.label}</span>
            )}
            <Link
              to={section.to}
              className="exploreCardAction"
              aria-label={`Open ${section.label}`}
            >
              <BsArrowsAngleExpand />
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
