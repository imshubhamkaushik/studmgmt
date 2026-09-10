import { useLocation } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import NotificationBell from "./NotificationBell";

// Single source of truth for page titles/descriptions/category shown in
// the sticky app header. Individual pages used to render their own
// duplicate "eyebrow + h1 + description" block below this one — this
// table now carries that eyebrow too, so the per-page copies could be
// deleted instead of showing the same heading twice on screen.
const getPageTitle = (pathname) => {
  const pages = [
    ["/dashboard", "Dashboard", "Overview of your student records and activity."],
    ["/students/new", "Add Student", "Create a new student record."],
    ["/students", "Students", "Manage, search, and organize student records."],
    ["/attendance", "Attendance", "Load a class, mark attendance, and save the day in one place."],
    ["/period-attendance", "Period Attendance", "Mark attendance for a specific scheduled period.", "Attendance"],
    ["/academic-years", "Academic Years", "Create and manage academic periods.", "Academic structure"],
    ["/classrooms", "Classrooms", "Manage classes, sections, capacity, and academic years.", "Academic structure"],
    ["/enrollments", "Enrollments", "Assign students to classrooms and review placement history.", "Academic placement"],
    ["/promotions", "Promotions", "Move students safely between academic years.", "Academic progression"],
    ["/users", "Users & Roles", "Manage access for administrators, staff, and teachers."],
    ["/audit-log", "Audit Log", "Browse and filter every recorded action across the system.", "Administration"],
    ["/teacher-assignments", "Teacher Assignments", "Assign teachers to the classrooms they manage.", "Academic staffing"],
    ["/assignments", "Assignments", "Create assignments and track student submissions.", "Coursework"],
    ["/academic-setup", "Academic Setup", "Manage subjects and grading terms.", "Academic structure"],
    ["/exams", "Exams", "Create exams per classroom and grading term.", "Grading"],
    ["/mark-entry", "Mark Entry", "Enter and save student marks for an exam.", "Grading"],
    ["/report-cards", "Report Cards", "Generate and download student report cards.", "Grading"],
    ["/announcements", "Announcements", "Send updates to staff, students, and parents.", "Communication"],
  ];

  if (pathname.endsWith("/edit"))
    return { title: "Edit Student", description: "Update an existing student record." };
  if (pathname.startsWith("/students/") && pathname !== "/students/new")
    return { title: "Student Details", description: "View student information and record history." };

  const match = pages.find(([path]) => pathname === path);
  return match
    ? { title: match[1], description: match[2], eyebrow: match[3] }
    : { title: "StudentHub", description: "Student management workspace." };
};

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || navigator.userAgent);

export default function Header({ onMenuClick, onSearchClick }) {
  const location = useLocation();
  const { title, description, eyebrow } = getPageTitle(location.pathname);

  return (
    <header className="app-header">
      <button type="button" className="header-menu-button" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={19} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
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

      <NotificationBell />
    </header>
  );
}
