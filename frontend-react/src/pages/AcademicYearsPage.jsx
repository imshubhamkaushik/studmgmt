import { useEffect, useState } from "react";
import { CalendarRange, CheckCircle2 } from "lucide-react";
import {
  createAcademicYear,
  getAcademicYears,
  activateAcademicYear,
} from "../api/academicYears";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function AcademicYearsPage() {
  const [items, setItems] = useState(null),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      name: "",
      startDate: "",
      endDate: "",
      isActive: false,
    });
  const load = () =>
    getAcademicYears()
      .then((r) => setItems(r.data))
      .catch((e) => setError(getApiErrorMessage(e, "Unable to load academic years.")));
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createAcademicYear(form);
      setForm({ name: "", startDate: "", endDate: "", isActive: false });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create academic year."));
    }
  };
  return (
    <main className="page">
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2><CalendarRange size={16} style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />New Academic Year</h2>
          </div>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <form className="student-form" onSubmit={submit}>
          <div>
            <label className="form-field-label" htmlFor="ay-name">Academic Year</label>
            <input
              id="ay-name"
              placeholder="2026-2027"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="ay-start">Start Date</label>
            <input
              id="ay-start"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="ay-end">End Date</label>
            <input
              id="ay-end"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <label className="form-checkbox-field">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active year
          </label>
          <div>
            <label className="form-field-label" htmlFor="ay-submit">&nbsp;</label>
            <button id="ay-submit" type="submit" className="button button-primary" style={{ width: "100%" }}>
              Create Academic Year
            </button>
          </div>
        </form>
      </section>
      <section className="dashboard-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>All Academic Years</h2>
            <p>{items?.length ?? 0} period{items?.length === 1 ? "" : "s"} on record.</p>
          </div>
        </div>
        {items === null ? (
          <div className="skeleton-rows">
            {Array.from({ length: 3 }).map((_, i) => <div className="skeleton" key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={CalendarRange} title="No academic years yet" message="Create your first academic year above to get started." />
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x._id}>
                    <td><strong>{x.name}</strong></td>
                    <td>{new Date(x.startDate).toLocaleDateString()}</td>
                    <td>{new Date(x.endDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${x.isActive ? "active" : "inactive"}`}>
                        <span className="status-badge-dot" aria-hidden="true" />
                        {x.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {!x.isActive && (
                        <button
                          type="button"
                          className="button button-small button-secondary"
                          onClick={async () => {
                            await activateAcademicYear(x._id);
                            load();
                          }}
                        >
                          <CheckCircle2 size={13} aria-hidden="true" />
                          Set active
                        </button>
                      )}
                    </td>
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
