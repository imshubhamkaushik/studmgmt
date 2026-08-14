import { Link } from "react-router-dom";

import { formatDate, formatDateOnly } from "../../utils/date";

export default function StudentTable({ students = [], onDelete }) {
  return (
    <div className="table-wrapper">
      <table className="student-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Roll No.</th>
            <th>Class</th>
            <th>Section</th>
            <th>Status</th>
            <th>Date of Birth</th>
            <th>Created</th>
            <th aria-label="Actions" />
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr key={student._id}>
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

              <td><span className={`status-badge status-${student.status ?? "active"}`}>{student.status ?? "active"}</span></td>

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

                  <Link
                    to={`/students/${student._id}/edit`}
                    className="button button-small button-secondary"
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    className="button button-small button-danger"
                    onClick={() => onDelete(student)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
