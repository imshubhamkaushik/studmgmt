import { useEffect, useState } from "react";
import {
  createAcademicYear,
  getAcademicYears,
  activateAcademicYear,
} from "../api/academicYears";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AcademicYearsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });

  const load = async () => {
    try {
      setError("");

      const response = await getAcademicYears();
      setItems(response.data ?? []);
    } catch (err) {
      setError(err.message || "Unable to load academic years.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await createAcademicYear(form);

      setForm({
        name: "",
        startDate: "",
        endDate: "",
        isActive: false,
      });

      await load();
    } catch (err) {
      setError(err.message || "Unable to create academic year.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (id) => {
    setError("");

    try {
      await activateAcademicYear(id);
      await load();
    } catch (err) {
      setError(err.message || "Unable to activate academic year.");
    }
  };

  return (
    <main className="page academic-years-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic structure</p>
          <h1>Academic Years</h1>
          <p>
            Create academic periods, manage dates, and control the currently
            active academic year.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <section className="card academic-year-card">
        <form className="academic-year-form" onSubmit={submit}>
          <label className="form-field">
            <span>Academic year</span>
            <input
              type="text"
              placeholder="2026-2027"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>Start date</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => updateForm("startDate", event.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>End date</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => updateForm("endDate", event.target.value)}
              required
            />
          </label>

          <label className="academic-year-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateForm("isActive", event.target.checked)}
            />
            <span>Set active</span>
          </label>

          <button
            type="submit"
            className="button button-primary academic-year-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Academic Year"}
          </button>
        </form>
      </section>

      <section className="card academic-year-list-card">
        <div className="table-wrapper">
          <table className="academic-year-table">
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-message">
                    No academic years have been created yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td className="academic-year-name">{item.name}</td>
                    <td>{formatDate(item.startDate)}</td>
                    <td>{formatDate(item.endDate)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          item.isActive ? "status-active" : "status-inactive"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="academic-year-actions">
                      {!item.isActive && (
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => handleActivate(item._id)}
                        >
                          Set active
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
