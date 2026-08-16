import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import {
  listTeacherAssignments,
  createTeacherAssignment,
  revokeTeacherAssignment,
} from "../api/teacherAssignments";
import { getClassrooms } from "../api/classrooms.js";
import { getUsers } from "../api/auth";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function TeacherAssignmentsPage() {
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [teacher, setTeacher] = useState("");
  const [classroom, setClassroom] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const [assignments, users, classrooms] = await Promise.all([
        listTeacherAssignments(),
        getUsers(),
        getClassrooms({ includeInactive: "true" }),
      ]);
      setRows(assignments.data || assignments || []);
      setTeachers(
        (users.data || users || []).filter(
          (user) => user.role === "teacher" && user.isActive,
        ),
      );
      setRooms(classrooms.data || classrooms || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load teacher assignments."));
    }
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createTeacherAssignment({
        teacherId: teacher,
        classroomId: classroom,
      });
      setTeacher("");
      setClassroom("");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Assignment failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      {/* <div className="page-heading">
        <div>
          <p className="eyebrow">Academic staffing</p>
          <h1><Shuffle size={22} style={{ marginRight: 10, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />Teacher Assignments</h1>
          <p>Assign teachers to the classrooms they manage.</p>
        </div>
      </div> */}
      {error && <div className="inline-error">{error}</div>}

      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>Assign a teacher</h2>
            <p>
              Assign an active teacher to a classroom they are responsible for.
            </p>
          </div>
        </div>
        <form className="student-form" onSubmit={submit}>
          <div>
            <label className="form-field-label" htmlFor="ta-teacher">Teacher</label>
            <select
              id="ta-teacher"
              value={teacher}
              onChange={(event) => setTeacher(event.target.value)}
              required
            >
              <option value="">Select teacher</option>
              {teachers.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} · {item.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="ta-classroom">Classroom</label>
            <select
              id="ta-classroom"
              value={classroom}
              onChange={(event) => setClassroom(event.target.value)}
              required
            >
              <option value="">Select classroom</option>
              {rooms.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.className}-{item.section}
                  {item.academicYear?.name ? ` · ${item.academicYear.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="ta-submit">&nbsp;</label>
            <button
              id="ta-submit"
              type="submit"
              className="button button-primary"
              disabled={busy}
              style={{ width: "100%" }}
            >
              {busy ? "Assigning..." : "Assign Teacher"}
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>Current assignments</h2>
            <p>
              {rows.length} assignment{rows.length === 1 ? "" : "s"} in the
              system.
            </p>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Classroom</th>
                <th>Academic Year</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-prompt-row">No teacher assignments yet.</td>
                </tr>
              ) : (
                rows.map((assignment) => (
                  <tr key={assignment._id}>
                    <td>
                      {assignment.teacher?.name ||
                        assignment.teacher?.email ||
                        assignment.teacher ||
                        "—"}
                    </td>
                    <td>
                      {assignment.classroom
                        ? `${assignment.classroom.className}-${assignment.classroom.section}`
                        : "—"}
                    </td>
                    <td>{assignment.classroom?.academicYear?.name || "—"}</td>
                    <td>
                      <span
                        className={`status-badge ${assignment.isActive ? "status-active" : "status-inactive"}`}
                      >
                        <span className="status-badge-dot" aria-hidden="true" />
                        {assignment.isActive ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td>
                      {assignment.isActive && (
                        <button
                          type="button"
                          className="button button-small button-secondary"
                          onClick={async () => {
                            try {
                              await revokeTeacherAssignment(assignment._id);
                              await load();
                            } catch (err) {
                              setError(
                                getApiErrorMessage(
                                  err,
                                  "Unable to revoke assignment.",
                                ),
                              );
                            }
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
