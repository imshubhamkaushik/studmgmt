import { useLocation } from "react-router-dom";
import { Menu, Search } from "lucide-react";

const getPageTitle = (pathname) => {
  const pages = [
    ["/dashboard", "Dashboard", "Overview of your student records and activity."],
    ["/students/new", "Add Student", "Create a new student record."],
    ["/students", "Students", "Manage, search, and organize student records."],
    ["/attendance", "Attendance", "Load a class, mark attendance, and save the day in one place."],
    ["/academic-years", "Academic Years", "Create and manage academic periods."],
    ["/classrooms", "Classrooms", "Manage classes, sections, capacity, and academic years."],
    ["/enrollments", "Enrollments", "Assign students to classrooms and review placement history."],
    ["/promotions", "Promotions", "Move students safely between academic years."],
    ["/users", "Users & Roles", "Manage access for administrators, staff, and teachers."],
    ["/teacher-assignments", "Teacher Assignments", "Assign teachers to the classrooms they manage."],
  ];

  if (pathname.endsWith("/edit"))
    return { title: "Edit Student", description: "Update an existing student record." };
  if (pathname.startsWith("/students/") && pathname !== "/students/new")
    return { title: "Student Details", description: "View student information and record history." };

  const match = pages.find(([path]) => pathname === path);
  return match
    ? { title: match[1], description: match[2] }
    : { title: "StudentHub", description: "Student management workspace." };
};

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || navigator.userAgent);

export default function Header({ onMenuClick, onSearchClick }) {
  const location = useLocation();
  const { title, description } = getPageTitle(location.pathname);

  return (
    <header className="app-header">
      <button type="button" className="header-menu-button" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={19} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      <button
        type="button"
        className="header-search-trigger"
        onClick={onSearchClick}
        aria-label="Open search (Ctrl+K)"
      >
        <Search size={15} aria-hidden="true" />
        <span>Search...</span>
        <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
    </header>
  );
}
