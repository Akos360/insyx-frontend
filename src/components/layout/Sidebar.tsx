import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LuBuilding2,
  LuLayoutGrid,
  LuSearch,
  LuUsers,
  LuShare2,
  LuChartBar,
  LuGlobe,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from "react-icons/lu";
import "./sidebar.css";

const exploreItems = [
  { to: "/search", label: "Search", icon: LuSearch },
  { to: "/authors", label: "Authors", icon: LuUsers },
  { to: "/institutions", label: "Institutions", icon: LuBuilding2 },
  { to: "/explore-net", label: "Explore Net", icon: LuShare2 },
  { to: "/graph", label: "Graph", icon: LuChartBar },
  { to: "/globe", label: "Globe", icon: LuGlobe },
];

const COLLAPSE_KEY = "sidebar-collapsed";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(COLLAPSE_KEY) === "true");

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }

  return (
    <>
      {mobileOpen && <div className="sidebarOverlay" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        aria-label="Primary"
        className={
          "sideNav" +
          (collapsed ? " sideNavCollapsed" : "") +
          (mobileOpen ? " sideNavMobileOpen" : "")
        }
      >
        <div className="sideNavHeader">
          <Link to="/explore" className="sideNavBrand" onClick={onCloseMobile}>
            <span className="sideNavBrandMark" aria-hidden="true">I</span>
            {!collapsed && <span>Insyx</span>}
          </Link>
          <button
            type="button"
            className="sideNavCollapseBtn"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? <LuPanelLeftOpen aria-hidden="true" /> : <LuPanelLeftClose aria-hidden="true" />}
          </button>
        </div>

        <nav className="sideNavGroup" aria-label="Overview">
          <NavLink
            to="/explore"
            onClick={onCloseMobile}
            className={({ isActive }) => "sideNavLink" + (isActive ? " sideNavLinkActive" : "")}
            title={collapsed ? "Overview" : undefined}
          >
            <LuLayoutGrid aria-hidden="true" />
            {!collapsed && <span>Overview</span>}
          </NavLink>
        </nav>

        <nav className="sideNavGroup" aria-label="Explore">
          {!collapsed && <div className="sideNavLabel">Explore</div>}
          {exploreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) => "sideNavLink" + (isActive ? " sideNavLinkActive" : "")}
              title={collapsed ? item.label : undefined}
            >
              <item.icon aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
