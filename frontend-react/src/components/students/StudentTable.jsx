import { Link, useNavigate } from "react-router-dom";
import { Pencil, Eye, Archive as ArchiveIcon, RotateCcw } from "lucide-react";
import { formatDate, formatDateOnly } from "../../utils/date";
import Avatar from "../common/Avatar";
import ActionMenu from "../common/ActionMenu";

const SORTABLE_COLUMNS = [
  { field: "studentId", label: "Student ID" },
  { field: "name", label: "Name" },
  { field: "rollNo", label: "Roll No." },
  { field: "class", label: "Class" },
  { field: "section", label: "Section" },
  { field: "status", label: "Status" },
  { field: "dob", label: "Date of Birth" },
  { field: "createdAt", label: "Created" },
];

function SortableHeader({ field, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === field;
  const nextOrder = isActive && sortOrder === "asc" ? "desc" : "asc";
  let ariaSort = "none";

  if (isActive) {
    ariaSort = sortOrder === "asc" ? "ascending" : "descending";
  }

  let sortIndicator = "↕";

  if (isActive) {
    sortIndicator = sortOrder === "asc" ? "▲" : "▼";
  }

  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className={`sort-header${isActive ? " sort-header-active" : ""}`}
        onClick={() => onSort(field, nextOrder)}
      >
        {label}
        <span className="sort-indicator" aria-hidden="true">
          {sortIndicator}
        </span>
      </button>
    </th>
  );
}

export default function StudentTable({
  students = [],
  onDelete,
  onRestore,
  selectedIds = [],
  onToggle,
  onToggleAll,
  showArchived = false,
  sortBy,
  sortOrder,
  onSortChange,
}) {
  const navigate = useNavigate();
  const allSelected =
    students.length > 0 &&
    students.every((student) => selectedIds.includes(student._id));
  const sortable = Boolean(onSortChange);
  const handleSort = (field, nextOrder) => onSortChange?.(field, nextOrder);

  return (
    <div className="table-wrapper">
      <table className="student-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                aria-label="Select all students"
                checked={allSelected}
                onChange={() => onToggleAll?.(students.map((s) => s._id))}
              />
            </th>
            {sortable
              ? SORTABLE_COLUMNS.map(({ field, label }) => (
                  <SortableHeader
                    key={field}
                    field={field}
                    label={label}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                ))
              : SORTABLE_COLUMNS.map(({ field, label }) => (
                  <th key={field}>{label}</th>
                ))}
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student._id}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${student.name}`}
                  checked={selectedIds.includes(student._id)}
                  onChange={() => onToggle?.(student._id)}
                />
              </td>
              <td>
                <span className="student-id">{student.studentId}</span>
              </td>
              <td>
                <Link
                  to={`/students/${student._id}`}
                  className="student-name-link"
                >
                  <Avatar name={student.name} size="sm" />
                  {student.name}
                </Link>
              </td>
              <td>{student.rollNo}</td>
              <td>{student.class}</td>
              <td>{student.section}</td>
              <td>
                <span
                  className={`status-badge status-${student.status || "unknown"}`}
                >
                  <span className="status-badge-dot" aria-hidden="true" />
                  {student.status || "unknown"}
                </span>
              </td>
              <td>{formatDateOnly(student.dob)}</td>
              <td>{formatDate(student.createdAt)}</td>
              <td>
                <div className="table-actions">
                  {!showArchived && (
                    <Link
                      to={`/students/${student._id}/edit`}
                      className="action-menu-trigger"
                      aria-label={`Edit ${student.name}`}
                      title="Edit"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </Link>
                  )}
                  <ActionMenu
                    label={`More actions for ${student.name}`}
                    items={[
                      {
                        key: "view",
                        label: "View Details",
                        icon: Eye,
                        onClick: () => navigate(`/students/${student._id}`),
                      },
                      { key: "divider", divider: true },
                      showArchived
                        ? {
                            key: "restore",
                            label: "Restore",
                            icon: RotateCcw,
                            onClick: () => onRestore?.(student),
                          }
                        : {
                            key: "archive",
                            label: "Archive",
                            icon: ArchiveIcon,
                            danger: true,
                            onClick: () => onDelete(student),
                          },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
