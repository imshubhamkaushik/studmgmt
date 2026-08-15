import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import Avatar from "../common/Avatar";

const getPageTitle = (pathname) => {
  const pages = [
    [
      "/dashboard",
      "Dashboard",
      "Overview of your student records and activity.",
    ],
    ["/students/new", "Add Student", "Create a new student record."],
    ["/students", "Students", "Manage, search, and organize student records."],
    [
      "/attendance",
      "Attendance",
      "Load a class, mark attendance, and save the day in one place.",
    ],
    [
      "/academic-years",
      "Academic Years",
      "Create and manage academic periods.",
    ],
    [
      "/classrooms",
      "Classrooms",
      "Manage classes, sections, capacity, and academic years.",
    ],
    [
      "/enrollments",
      "Enrollments",
      "Assign students to classrooms and review placement history.",
    ],
    [
      "/promotions",
      "Promotions",
      "Move students safely between academic years.",
    ],
    [
      "/users",
      "Users & Roles",
      "Manage access for administrators, staff, and teachers.",
    ],
    [
      "/teacher-assignments",
      "Teacher Assignments",
      "Assign teachers to the classrooms they manage.",
    ],
  ];

  if (pathname.endsWith("/edit"))
    return {
      title: "Edit Student",
      description: "Update an existing student record.",
    };
  if (pathname.startsWith("/students/") && pathname !== "/students/new")
    return {
      title: "Student Details",
      description: "View student information and record history.",
    };

  const match = pages.find(([path]) => pathname === path);
  return match
    ? { title: match[1], description: match[2] }
    : { title: "StudentHub", description: "Student management workspace." };
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { title, description } = getPageTitle(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    navigate(
      query ? `/students?search=${encodeURIComponent(query)}` : "/students",
    );
  };

  return (
    <header className="app-header">
      <button
        type="button"
        className="header-menu-button"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={19} />
      </button>

      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      <form className="header-search" role="search" onSubmit={submitSearch}>
        <Search size={16} aria-hidden="true" />
        <label htmlFor="header-search-input" className="sr-only">
          Search students
        </label>
        <input
          id="header-search-input"
          type="search"
          placeholder="Search students by name or ID..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </form>

      <div className="header-actions">
        <div className="header-user" ref={menuRef}>
          <button
            type="button"
            className="header-user-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.name || user?.role || "User"} size="sm" />
            <span className="header-user-meta">
              <strong>{user?.name || "User"}</strong>
              <span>{user?.role || "user"}</span>
            </span>
            <ChevronDown
              size={15}
              className="header-user-caret"
              aria-hidden="true"
            />
          </button>

          {menuOpen && (
            <div className="header-user-menu" role="menu">
              <button type="button" role="menuitem" onClick={logout}>
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
