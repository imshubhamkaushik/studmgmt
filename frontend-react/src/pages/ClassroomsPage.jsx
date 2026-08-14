import { useEffect, useState } from "react";
import { getAcademicYears } from "../api/academicYears";
import { createClassroom, getClassrooms } from "../api/classrooms";
export default function ClassroomsPage() {
  const [years, setYears] = useState([]),
    [rooms, setRooms] = useState([]),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    className: "",
    section: "",
    academicYear: "",
    capacity: "",
  });
  const load = () =>
    Promise.all([
      getAcademicYears(),
      getClassrooms({ includeInactive: "true" }),
    ])
      .then(([a, c]) => {
        setYears(a.data);
        setRooms(c.data);
        if (!form.academicYear) {
          const active = a.data.find((x) => x.isActive);
          if (active) setForm((f) => ({ ...f, academicYear: active._id }));
        }
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await createClassroom({ ...form, capacity: form.capacity || null });
      setForm((f) => ({ ...f, className: "", section: "", capacity: "" }));
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic structure</p>
          <h1>Classrooms</h1>
          <p>Manage class, section, academic year and capacity.</p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <section className="card">
        <form className="student-form" onSubmit={submit}>
          <input
            placeholder="Class (e.g. 10)"
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
          />
          <input
            placeholder="Section (e.g. A)"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
          />
          <select
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
          <input
            type="number"
            min="1"
            placeholder="Capacity (optional)"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
          <button type="submit" className="button primary">Create Classroom</button>
        </form>
      </section>
      <section className="card">
        <div className="table-wrapper">
          <table>
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
              {rooms.map((r) => (
                <tr key={r._id}>
                  <td>{r.className}</td>
                  <td>{r.section}</td>
                  <td>{r.academicYear?.name}</td>
                  <td>{r.capacity ?? "—"}</td>
                  <td>
                    {r.studentCount}
                    {r.capacity ? ` / ${r.capacity}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
