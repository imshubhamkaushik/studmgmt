import { Link } from "react-router-dom";
import { formatDate, formatDateOnly } from "../../utils/date";

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
                  {student.name}
                </Link>
              </td>
              <td>{student.rollNo}</td>
              <td>{student.class}</td>
              <td>{student.section}</td>
              <td>
                <span
                  className={`status-badge status-${student.status ?? "active"}`}
                >
                  {student.status ?? "active"}
                </span>
              </td>
              <td>{formatDateOnly(student.dob)}</td>
              <td>{formatDate(student.createdAt)}</td>
              <td>
                <div className="table-actions">
                  <Link
                    to={`/students/${student._id}`}
                    className="button button-small button-secondary"
                  >
                    View
                  </Link>
                  {!showArchived && (
                    <Link
                      to={`/students/${student._id}/edit`}
                      className="button button-small button-secondary"
                    >
                      Edit
                    </Link>
                  )}
                  {showArchived ? (
                    <button
                      type="button"
                      className="button button-small button-primary"
                      onClick={() => onRestore?.(student)}
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button-small button-danger"
                      onClick={() => onDelete(student)}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
