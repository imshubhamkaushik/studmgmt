import { useCallback, useEffect, useState } from "react";
import { School, PlusCircle } from "lucide-react";
import { getAcademicYears } from "../api/academicYears";
import { createClassroom, getClassrooms } from "../api/classrooms";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function ClassroomsPage() {
  const [years, setYears] = useState([]),
    [rooms, setRooms] = useState(null),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    className: "",
    section: "",
    academicYear: "",
    capacity: "",
  });
  const load = useCallback(
    () =>
      Promise.all([
        getAcademicYears(),
        getClassrooms({ includeInactive: "true" }),
      ])
        .then(([a, c]) => {
          setYears(a.data);
          setRooms(c.data);
          setForm((current) => {
            if (current.academicYear) return current;
            const active = a.data.find((x) => x.isActive);
            return active ? { ...current, academicYear: active._id } : current;
          });
        })
        .catch((e) => setError(getApiErrorMessage(e, "Unable to load classrooms."))),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await createClassroom({ ...form, capacity: form.capacity || null });
      setForm((f) => ({ ...f, className: "", section: "", capacity: "" }));
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create classroom."));
    }
  };
  return (
    <main className="page">
      {/* <div className="page-heading">
        <div>
          <p className="eyebrow">Academic structure</p>
          <h1>Classrooms</h1>
          <p>Manage class, section, academic year and capacity.</p>
        </div>
      </div> */}
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2><School size={16} style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />New Classroom</h2>
          </div>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <form className="student-form" onSubmit={submit}>
          <div>
            <label className="form-field-label" htmlFor="cr-class">Class</label>
            <input
              id="cr-class"
              placeholder="e.g. 10"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="cr-section">Section</label>
            <input
              id="cr-section"
              placeholder="e.g. A"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="cr-year">Academic Year</label>
            <select
              id="cr-year"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
            >
              <option value="">Select academic year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="cr-capacity">Capacity (optional)</label>
            <input
              id="cr-capacity"
              type="number"
              min="1"
              placeholder="e.g. 40"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="cr-submit">&nbsp;</label>
            <button id="cr-submit" type="submit" className="button button-primary" style={{ width: "100%" }}>
              <PlusCircle size={15} aria-hidden="true" />
              Create Classroom
            </button>
          </div>
        </form>
      </section>
      <section className="dashboard-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>All Classrooms</h2>
            <p>{rooms?.length ?? 0} classroom{rooms?.length === 1 ? "" : "s"} configured.</p>
          </div>
        </div>
        {rooms === null ? (
          <div className="skeleton-rows">
            {Array.from({ length: 3 }).map((_, i) => <div className="skeleton" key={i} />)}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState icon={School} title="No classrooms yet" message="Create your first classroom above to get started." />
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Academic Year</th>
                  <th>Capacity</th>
                  <th>Active students</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => {
                  const full = r.capacity && r.studentCount >= r.capacity;
                  return (
                    <tr key={r._id}>
                      <td><strong>{r.className}</strong></td>
                      <td>{r.section}</td>
                      <td>{r.academicYear?.name}</td>
                      <td>{r.capacity ?? "—"}</td>
                      <td>
                        <span className={full ? "status-badge" : ""} style={full ? { background: "var(--warning-soft)", color: "var(--warning)" } : undefined}>
                          {r.studentCount}
                          {r.capacity ? ` / ${r.capacity}` : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
