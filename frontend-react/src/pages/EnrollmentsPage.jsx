import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, History, Search } from "lucide-react";
import { getStudents } from "../api/students";
import { getAcademicYears } from "../api/academicYears";
import { getClassrooms } from "../api/classrooms";
import EmptyState from "../components/common/EmptyState";
import { getEnrollments, createEnrollment } from "../api/enrollments";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

const emptyForm = {
  studentId: "",
  academicYearId: "",
  classroomId: "",
  rollNo: "",
};

export default function EnrollmentsPage() {
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const filteredHistoryRows = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.student?.name, r.academicYear?.name, r.classroom?.className, r.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [rows, historySearch]);

  const load = async () => {
    setError("");
    try {
      const [s, y, c, e] = await Promise.all([
        getStudents({ limit: 100 }),
        getAcademicYears(),
        getClassrooms({ includeInactive: "true" }),
        getEnrollments(),
      ]);
      setStudents(s.data.students || s.data || []);
      setYears(y.data || []);
      setRooms(c.data || []);
      setRows(e.data || []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to load enrollment data."));
    }
  };
  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const filteredRooms = (yearId) =>
    rooms.filter(
      (r) => String(r.academicYear?._id || r.academicYear) === String(yearId),
    );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createEnrollment({ ...form, rollNo: Number(form.rollNo) });
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to enroll student."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page-narrow">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic placement</p>
          <h1>
            <ArrowLeftRight
              size={22}
              style={{
                marginRight: 10,
                verticalAlign: -3,
                color: "var(--brand)",
              }}
              aria-hidden="true"
            />
            Enrollments
          </h1>
          <p>
            Assign students to academic classrooms. To move students between
            academic years, use the Promotions page.
          </p>
        </div>
      </div>
      {error && <div className="inline-error">{error}</div>}

      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Enroll a student</h2>
            <p>Create the student's placement for an academic year.</p>
          </div>
        </div>
        <form className="student-form" onSubmit={submit}>
          <div>
            <label className="form-field-label" htmlFor="en-student">
              Student
            </label>
            <select
              id="en-student"
              required
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            >
              <option value="">Select active student</option>
              {students
                .filter((s) => s.status === "active" && !s.isDeleted)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.studentId})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="en-year">
              Academic Year
            </label>
            <select
              id="en-year"
              required
              value={form.academicYearId}
              onChange={(e) =>
                setForm({
                  ...form,
                  academicYearId: e.target.value,
                  classroomId: "",
                })
              }
            >
              <option value="">Select academic year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name}
                  {y.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="en-classroom">
              Classroom
            </label>
            <select
              id="en-classroom"
              required
              value={form.classroomId}
              onChange={(e) =>
                setForm({ ...form, classroomId: e.target.value })
              }
            >
              <option value="">Select classroom</option>
              {filteredRooms(form.academicYearId).map((r) => (
                <option key={r._id} value={r._id}>
                  {r.className}-{r.section}
                  {r.capacity ? ` · ${r.studentCount || 0}/${r.capacity}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="en-roll">
              Roll Number
            </label>
            <input
              id="en-roll"
              required
              type="number"
              min="1"
              placeholder="e.g. 12"
              value={form.rollNo}
              onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
            />
          </div>
          <div className="form-submit-field">
            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
            >
              {busy ? "Saving..." : "Enroll Student"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Enrollment history</h2>
            <p>
              Historical placements are preserved instead of overwriting the
              student record.
            </p>
          </div>
          {rows.length > 6 && (
            <div className="search-field" style={{ maxWidth: 240 }}>
              <label htmlFor="history-search" className="sr-only">
                Search enrollment history
              </label>
              <Search size={15} aria-hidden="true" />
              <input
                id="history-search"
                type="search"
                placeholder="Search student, year, class..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No enrollment history yet"
            message="Enroll a student above to start building placement history."
          />
        ) : filteredHistoryRows.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching enrollments"
            message={`Nothing matches "${historySearch}".`}
          />
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Academic Year</th>
                  <th>Classroom</th>
                  <th>Roll No.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryRows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.student?.name || "—"}</td>
                    <td>{r.academicYear?.name || "—"}</td>
                    <td>
                      {r.classroom
                        ? `${r.classroom.className}-${r.classroom.section}`
                        : "—"}
                    </td>
                    <td>{r.rollNo}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
