import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "./app-shell.css";

export default function AppShell() {
  return (
    <div className="appShell">
      <Navbar />
      <div className="appShellBody">
        <Sidebar />
        <div className="appShellContent">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
