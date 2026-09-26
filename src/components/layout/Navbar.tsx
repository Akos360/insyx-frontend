import { Link, useNavigate } from "react-router-dom";
import { BsSkipStartFill } from "react-icons/bs";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../../auth/useAuth";
import "./navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="topNavbar">
      <div className="topNavbarLeft">
        <button
          type="button"
          className="topNavbarBack"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <BsSkipStartFill />
        </button>
        <Link to="/explore" className="topNavbarBrand">Insyx Explorer</Link>
      </div>
      <div className="topNavbarMeta">Science-of-Science Workspace</div>
      <div className="topNavbarActions">
        {user ? (
          <span className="topNavbarUser">
            {user.email}
            <button type="button" className="topNavbarLogout" onClick={handleLogout}>
              Logout
            </button>
          </span>
        ) : (
          <Link to="/" className="topNavbarLogout">Login</Link>
        )}
        <ThemeToggle />
        <a
          className="topNavbarSwagger"
          href={`${import.meta.env.VITE_API_BASE_URL}/api`}
          target="_blank"
          rel="noreferrer"
        >
          API
        </a>
      </div>
    </header>
  );
}
