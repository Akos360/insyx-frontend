import { NavLink } from "react-router-dom";
import "./sidebar.css";
import { BsGearFill } from "react-icons/bs";

const items = [
  { to: "/search", label: "Search" },
  { to: "/authors", label: "Authors" },
  { to: "/explore-net", label: "Explore Net" },
  { to: "/graph", label: "Graph" },
  { to: "/globe", label: "Globe" },
];

export default function Sidebar() {
  return (
    <aside className="sideNav">
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