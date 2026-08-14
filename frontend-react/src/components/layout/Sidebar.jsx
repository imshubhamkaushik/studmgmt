import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

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
  {
    to: "/attendance",
    label: "Attendance",
    icon: "✓",
  },
  { to: "/academic-years", label: "Academic Years", icon: "◷", roles: ["admin"] },
  { to: "/classrooms", label: "Classrooms", icon: "▤", roles: ["admin"] },
  { to: "/enrollments", label: "Enrollments", icon: "↔", roles: ["admin","staff"] },
  { to: "/promotions", label: "Promotions", icon: "⇧", roles: ["admin"] },
  { to: "/users", label: "Users & Roles", icon: "♙", roles: ["admin"] },
];

export default function Sidebar() {
  const { user } = useAuth();
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
        {navigationItems.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
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
        <small>{user?.role || "user"}</small>
      </div>
    </aside>
  );
}
