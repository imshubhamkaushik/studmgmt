import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  UserPlus,
  Search,
  CornerDownLeft,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { getStudents } from "../../api/students";
import Avatar from "./Avatar";

const PAGES = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: "overview home" },
  { to: "/students", label: "Students", icon: Users, keywords: "list roster" },
  { to: "/students/new", label: "Add Student", icon: UserPlus, keywords: "create new enroll" },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, keywords: "mark present absent" },
  { to: "/academic-years", label: "Academic Years", icon: CalendarRange, roles: ["admin"] },
  { to: "/classrooms", label: "Classrooms", icon: School, roles: ["admin"], keywords: "class section" },
  { to: "/enrollments", label: "Enrollments", icon: ArrowLeftRight, roles: ["admin", "staff"], keywords: "enroll placement" },
  { to: "/promotions", label: "Promotions", icon: ArrowUpFromLine, roles: ["admin", "teacher"], keywords: "promote next year" },
  { to: "/teacher-assignments", label: "Teacher Assignments", icon: Shuffle, roles: ["admin", "staff"] },
  { to: "/users", label: "Users & Roles", icon: ShieldCheck, roles: ["admin"], keywords: "staff accounts permissions" },
];

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [query, setQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const debouncedQuery = useDebouncedValue(query, 220);

  const pages = useMemo(
    () => PAGES.filter((page) => !page.roles || hasRole(...page.roles)),
    [hasRole],
  );

  const matchedPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (page) =>
        page.label.toLowerCase().includes(q) ||
        page.keywords?.toLowerCase().includes(q),
    );
  }, [pages, query]);

  useEffect(() => {
    if (!open) return undefined;
    Promise.resolve().then(() => {
      setQuery("");
      setStudentResults([]);
      setActiveIndex(0);
    });
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open || !debouncedQuery.trim()) {
      Promise.resolve().then(() => setStudentResults([]));
      return undefined;
    }
    let cancelled = false;
    getStudents({ search: debouncedQuery.trim(), limit: 5 })
      .then((response) => {
        if (!cancelled) setStudentResults(response.data || []);
      })
      .catch(() => {
        if (!cancelled) setStudentResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const results = useMemo(
    () => [
      ...matchedPages.map((page) => ({ type: "page", ...page })),
      ...studentResults.map((student) => ({ type: "student", student })),
    ],
    [matchedPages, studentResults],
  );

  const select = useCallback(
    (item) => {
      if (!item) return;
      if (item.type === "page") navigate(item.to);
      else navigate(`/students/${item.student._id}`);
      onClose();
    },
    [navigate, onClose],
  );

  const [lastResultsLength, setLastResultsLength] = useState(0);
  if (results.length !== lastResultsLength) {
    setLastResultsLength(results.length);
    setActiveIndex(0);
  }

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" onMouseDown={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-palette-input">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, or jump to a student..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="command-palette-results">
          {matchedPages.length > 0 && (
            <div className="command-palette-group">
              <span className="command-palette-group-label">Pages</span>
              {matchedPages.map((page) => {
                const index = results.findIndex((r) => r.type === "page" && r.to === page.to);
                return (
                  <button
                    type="button"
                    key={page.to}
                    className={`command-palette-item${index === activeIndex ? " command-palette-item-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(results[index])}
                  >
                    <page.icon size={16} aria-hidden="true" />
                    {page.label}
                    {index === activeIndex && <CornerDownLeft size={13} className="command-palette-enter" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}

          {studentResults.length > 0 && (
            <div className="command-palette-group">
              <span className="command-palette-group-label">Students</span>
              {studentResults.map((student) => {
                const index = results.findIndex((r) => r.type === "student" && r.student._id === student._id);
                return (
                  <button
                    type="button"
                    key={student._id}
                    className={`command-palette-item${index === activeIndex ? " command-palette-item-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(results[index])}
                  >
                    <Avatar name={student.name} size="sm" />
                    <span className="command-palette-student-meta">
                      {student.name}
                      <small>{student.studentId} · Class {student.class}-{student.section}</small>
                    </span>
                    {index === activeIndex && <CornerDownLeft size={13} className="command-palette-enter" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}

          {results.length === 0 && (
            <div className="command-palette-empty">No matches for "{query}".</div>
          )}
        </div>
      </div>
    </div>
  );
}
