import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuChevronDown, LuUser, LuSettings, LuLogOut } from "react-icons/lu";
import { useAuth } from "../../auth/useAuth";
import "./avatar-menu.css";

function initialsFor(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

export default function AvatarMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/");
  }

  return (
    <div className="avatarMenuRoot" ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="avatarBtn"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="avatar">{initialsFor(user.name, user.email)}</span>
        <LuChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div className="avatarMenu" role="menu" aria-label="Account">
          <div className="avatarMenuHead">
            <span className="avatar avatarMenuHeadAvatar">{initialsFor(user.name, user.email)}</span>
            <div className="avatarMenuHeadText">
              <span className="avatarMenuName">{user.name || "Unnamed"}</span>
              <span className="avatarMenuEmail">{user.email}</span>
            </div>
          </div>
          <div className="avatarMenuSep" />
          <Link to="/account" role="menuitem" className="avatarMenuItem" onClick={() => setOpen(false)}>
            <LuUser aria-hidden="true" />
            <span>Profile</span>
          </Link>
          <Link to="/settings" role="menuitem" className="avatarMenuItem" onClick={() => setOpen(false)}>
            <LuSettings aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <div className="avatarMenuSep" />
          <button type="button" role="menuitem" className="avatarMenuItem avatarMenuDanger" onClick={handleLogout}>
            <LuLogOut aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
