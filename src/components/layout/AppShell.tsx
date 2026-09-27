import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "./app-shell.css";

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="appShell">
      <Navbar onOpenMobileNav={() => setMobileNavOpen(true)} />
      <div className="appShellBody">
        <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
        <div className="appShellContent">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
