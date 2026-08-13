import { NavLink } from "react-router-dom";

const navigationItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: "▦",
  },
  {
    to: "/students",
    label: "Students",
    icon: "◉",
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="app-brand">
        <span className="app-brand-mark">S</span>

        <span className="app-brand-text">
          <strong>StudentHub</strong>
          <small>Management System</small>
        </span>
      </NavLink>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>StudentHub</span>
        <small>Version 1.0</small>
      </div>
    </aside>
  );
}
