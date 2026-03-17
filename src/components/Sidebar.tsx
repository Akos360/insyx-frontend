import { NavLink, useNavigate } from "react-router-dom";
import "./sidebar.css";
import { BsGearFill, BsSkipStartFill } from "react-icons/bs";
import ThemeToggle from "./ThemeToggle";

const items = [
  { to: "/explore", label: "Explore" },
  { to: "/search", label: "Search" },
  { to: "/explore-net", label: "Explore Net" },
  { to: "/paper", label: "Paper" },
  { to: "/globe", label: "Globe" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sideNav">
      <button
        type="button"
        className="sideNavBackButton"
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        <BsSkipStartFill className="sideNavBackIcon" />
      </button>

      <nav className="sideNavLinks" aria-label="Primary">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "sideNavLink sideNavLinkActive" : "sideNavLink"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sideNavFooter">
        <div className="sideNavThemeToggle">
          <ThemeToggle compact />
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "sideNavLink sideNavLinkActive sideNavSettingsLink" : "sideNavLink sideNavSettingsLink"
          }
        >
          <BsGearFill aria-hidden="true" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
