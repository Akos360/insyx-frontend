import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import "./explore.css";
import { BsArrowsAngleExpand } from "react-icons/bs";
import NetPreview from "../components/NetPreview";
import GraphPreview from "../components/GraphPreview";
import SearchPreview from "../components/SearchPreview";

const GlobeScene = lazy(() => import("../components/GlobeScene"));

const sections = [
  { id: "panel-1", label: "Search", to: "/search" },
  { id: "panel-2", label: "Explore Net", to: "/explore-net" },
  { id: "panel-3", label: "Graph", to: "/graph" },
  { id: "panel-4", label: "Globe", to: "/globe" },
];

function cardClass(to: string) {
  if (to === "/globe") return "exploreCard exploreCardGlobe";
  if (to === "/explore-net") return "exploreCard exploreCardNet";
  if (to === "/graph") return "exploreCard exploreCardGraph";
  if (to === "/search") return "exploreCard exploreCardSearch";
  return "exploreCard";
}

export default function ExplorePage() {
  return (
    <main className="exploreRoot">
      <div className="exploreGrid">
        {sections.map((section) => (
          <div key={section.id} className={cardClass(section.to)}>
            {section.to === "/globe" ? (
              <Suspense fallback={<div className="exploreCardGlobeFallback" />}>
                <div className="exploreCardGlobePreview">
                  <GlobeScene compact />
                </div>
              </Suspense>
            ) : section.to === "/explore-net" ? (
              <NetPreview />
            ) : section.to === "/graph" ? (
              <GraphPreview />
            ) : section.to === "/search" ? (
              <SearchPreview />
            ) : null}

            {section.to !== "/search" && (
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