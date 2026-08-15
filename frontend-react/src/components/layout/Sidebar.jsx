import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarRange,
  School,
  ArrowLeftRight,
  ArrowUpFromLine,
  Shuffle,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import Avatar from "../common/Avatar";

const navigationGroups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/students", label: "Students", icon: Users },
      { to: "/attendance", label: "Attendance", icon: CalendarCheck },
    ],
  },
  {
    label: "Academics",
    items: [
      {
        to: "/academic-years",
        label: "Academic Years",
        icon: CalendarRange,
        roles: ["admin"],
      },
      {
        to: "/classrooms",
        label: "Classrooms",
        icon: School,
        roles: ["admin"],
      },
      {
        to: "/enrollments",
        label: "Enrollments",
        icon: ArrowLeftRight,
        roles: ["admin", "staff"],
      },
      {
        to: "/promotions",
        label: "Promotions",
        icon: ArrowUpFromLine,
        roles: ["admin"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        to: "/teacher-assignments",
        label: "Teacher Assignments",
        icon: Shuffle,
        roles: ["admin"],
      },
      {
        to: "/users",
        label: "Users & Roles",
        icon: ShieldCheck,
        roles: ["admin"],
      },
    ],
  },
];

export default function Sidebar({ open = false, onClose }) {
  const { user } = useAuth();
  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(user?.role),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${open ? " sidebar-open" : ""}`}
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>

        <NavLink to="/dashboard" className="app-brand" onClick={onClose}>
          <span className="app-brand-mark">
            <School size={20} />
          </span>
          <span className="app-brand-text">
            <strong>StudentHub</strong>
            <small>Management System</small>
          </span>
        </NavLink>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {visibleGroups.map((group) => (
            <div className="sidebar-nav-group" key={group.label}>
              <span className="sidebar-nav-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    <item.icon size={18} strokeWidth={2.1} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Avatar name={user?.name || user?.role || "User"} size="md" />
          <div className="sidebar-footer-text">
            <strong>{user?.name || "User"}</strong>
            <small>{user?.role || "user"}</small>
          </div>
        </div>
      </aside>
    </>
  );
}
