import { Link } from "react-router-dom";
import { formatDate, formatDateOnly } from "../../utils/date";

export default function StudentTable({ students = [], onDelete, onRestore, selectedIds = [], onToggle, onToggleAll, showArchived = false }) {
  const allSelected = students.length > 0 && students.every((student) => selectedIds.includes(student._id));
  return (
    <div className="table-wrapper">
      <table className="student-table">
        <thead><tr>
          <th><input type="checkbox" aria-label="Select all students" checked={allSelected} onChange={() => onToggleAll?.(students.map((s) => s._id))} /></th>
          <th>Student ID</th><th>Name</th><th>Roll No.</th><th>Class</th><th>Section</th><th>Status</th><th>Date of Birth</th><th>Created</th><th aria-label="Actions" />
        </tr></thead>
        <tbody>{students.map((student) => (
          <tr key={student._id}>
            <td><input type="checkbox" aria-label={`Select ${student.name}`} checked={selectedIds.includes(student._id)} onChange={() => onToggle?.(student._id)} /></td>
            <td><span className="student-id">{student.studentId}</span></td>
            <td><Link to={`/students/${student._id}`} className="student-name-link">{student.name}</Link></td>
            <td>{student.rollNo}</td><td>{student.class}</td><td>{student.section}</td>
            <td><span className={`status-badge status-${student.status ?? "active"}`}>{student.status ?? "active"}</span></td>
            <td>{formatDateOnly(student.dob)}</td><td>{formatDate(student.createdAt)}</td>
            <td><div className="table-actions">
              <Link to={`/students/${student._id}`} className="button button-small button-secondary">View</Link>
              {!showArchived && <Link to={`/students/${student._id}/edit`} className="button button-small button-secondary">Edit</Link>}
              {showArchived ? <button type="button" className="button button-small button-primary" onClick={() => onRestore?.(student)}>Restore</button> :
              <button type="button" className="button button-small button-danger" onClick={() => onDelete(student)}>Archive</button>}
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}