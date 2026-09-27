import { Link, useLocation } from "react-router-dom";
import { LuMenu, LuPlus } from "react-icons/lu";
import { useAuth } from "../../auth/useAuth";
import AvatarMenu from "./AvatarMenu";
import "./navbar.css";

const TITLES: Array<[string, string]> = [
  ["/explore", "Overview"],
  ["/search", "Search"],
  ["/authors", "Authors"],
  ["/author/", "Author"],
  ["/explore-net", "Explore Net"],
  ["/graph", "Graph"],
  ["/paper/", "Paper"],
  ["/globe", "Globe"],
  ["/settings", "Settings"],
  ["/account", "Profile"],
];

function titleForPath(pathname: string): string {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix));
  return match?.[1] ?? "Insyx";
}

type NavbarProps = {
  onOpenMobileNav: () => void;
};

export default function Navbar({ onOpenMobileNav }: NavbarProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = titleForPath(pathname);

  return (
    <header className="topNavbar">
      <div className="topNavbarLeft">
        <button
          type="button"
          className="topNavbarMenuBtn"
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
        >
          <LuMenu aria-hidden="true" />
        </button>
        <h1 className="topNavbarTitle">{title}</h1>
      </div>
      <div className="topNavbarActions">
        {pathname !== "/search" && (
          <Link to="/search" className="uiBtn uiBtnPrimary">
            <LuPlus aria-hidden="true" />
            <span>New search</span>
          </Link>
        )}
        {user ? <AvatarMenu /> : <Link to="/" className="topNavbarLogin">Login</Link>}
      </div>
    </header>
  );
}
