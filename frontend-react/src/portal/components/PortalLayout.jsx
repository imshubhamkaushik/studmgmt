import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { GraduationCap, LayoutDashboard, ClipboardList, CalendarCheck, FileText, Bell, KeyRound, LogOut } from "lucide-react";
import { usePortalAuth } from "../auth/usePortalAuth";
import PortalNotificationBell from "./PortalNotificationBell";

const NAV_ITEMS = [
  { to: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/portal/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/portal/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/portal/report-card", label: "Report Card", icon: FileText },
  { to: "/portal/notifications", label: "Notifications", icon: Bell },
];

export default function PortalLayout() {
  const { user, isGuardian, logout } = usePortalAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/portal/login", { replace: true });
  }

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-brand">
          <span className="portal-brand-mark">
            <GraduationCap size={18} />
          </span>
          <span>Student &amp; Family Portal</span>
        </div>

        <nav className="portal-nav" aria-label="Portal navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="portal-topbar-actions">
          <PortalNotificationBell />
          <div className="portal-user-menu">
            <span className="portal-user-name">
              {user?.name}
              {isGuardian && <span className="portal-user-role">Parent/Guardian</span>}
            </span>
            <NavLink to="/portal/change-password" className="icon-button" aria-label="Change password">
              <KeyRound size={16} />
            </NavLink>
            <button type="button" className="icon-button" onClick={handleLogout} aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav className="portal-nav portal-nav-mobile" aria-label="Portal navigation (mobile)">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}>
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="portal-content">
        <Outlet />
      </main>
    </div>
  );
}
