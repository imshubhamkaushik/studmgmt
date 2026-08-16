import { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);

  // Close the mobile drawer whenever the route changes. Adjusting state
  // during render (rather than in an effect) avoids an extra commit and
  // matches React's guidance for "resetting state when a prop changes".
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
