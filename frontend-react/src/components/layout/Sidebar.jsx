import { useEffect, useRef, useState } from "react";
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
  ChevronsUpDown,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";
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
      { to: "/academic-years", label: "Academic Years", icon: CalendarRange, roles: ["admin"] },
      { to: "/classrooms", label: "Classrooms", icon: School, roles: ["admin"] },
      { to: "/enrollments", label: "Enrollments", icon: ArrowLeftRight, roles: ["admin", "staff"] },
      { to: "/promotions", label: "Promotions", icon: ArrowUpFromLine, roles: ["admin"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/teacher-assignments", label: "Teacher Assignments", icon: Shuffle, roles: ["admin", "staff"] },
      { to: "/users", label: "Users & Roles", icon: ShieldCheck, roles: ["admin"] },
    ],
  },
];

// The user's identity lives only once in the UI — here in the sidebar
// footer — rather than being duplicated in the header too. This makes the
// whole footer row a button that opens a small menu (currently just Sign
// out) above itself, since it's pinned to the bottom of the viewport.
function SidebarUserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="sidebar-footer" ref={containerRef}>
      <button
        type="button"
        className="sidebar-footer-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user?.name || user?.role || "User"} size="md" />
        <span className="sidebar-footer-text">
          <strong>{user?.name || "User"}</strong>
          <small>{user?.role || "user"}</small>
        </span>
        <ChevronsUpDown size={15} aria-hidden="true" className="sidebar-footer-caret" />
      </button>

      {open && (
        <div className="sidebar-footer-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();
  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(user?.role)),
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
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu">
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
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
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

        <SidebarUserMenu user={user} logout={logout} />
      </aside>
    </>
  );
}
