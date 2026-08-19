import { useCallback, useEffect, useMemo, useState } from "react";
import { School, PlusCircle, Layers, Search } from "lucide-react";
import { getAcademicYears } from "../api/academicYears";
import {
  createClassroom,
  generateDefaultClassrooms,
  getClassrooms,
} from "../api/classrooms";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import { useToast } from "../hooks/useToast";
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
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const { show } = useToast();

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
        .catch((e) =>
          setError(getApiErrorMessage(e, "Unable to load classrooms.")),
        ),
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

  const selectedYear = years.find((y) => y._id === form.academicYear);

  const filteredRooms = useMemo(() => {
    if (!rooms) return rooms;
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      [r.className, r.section, r.academicYear?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [rooms, search]);

  const runGenerateDefaults = async () => {
    setGenerating(true);
    try {
      const result = await generateDefaultClassrooms(form.academicYear);
      show(
        result.data.created > 0
          ? `Created ${result.data.created} classroom${result.data.created === 1 ? "" : "s"}${result.data.skipped ? ` (${result.data.skipped} already existed).` : "."}`
          : "All 36 default classrooms already exist for this academic year.",
      );
      setConfirmGenerate(false);
      load();
    } catch (err) {
      show(
        getApiErrorMessage(err, "Unable to generate default classrooms."),
        "error",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="page page-narrow">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic structure</p>
          <h1>Classrooms</h1>
          <p>Manage class, section, academic year and capacity.</p>
        </div>
      </div>
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>
              <School
                size={16}
                style={{
                  marginRight: 8,
                  verticalAlign: -3,
                  color: "var(--brand)",
                }}
                aria-hidden="true"
              />
              New Classroom
            </h2>
            <p>Add one classroom at a time, or generate a full set below.</p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setConfirmGenerate(true)}
            disabled={!form.academicYear}
            title={
              !form.academicYear ? "Select an academic year first" : undefined
            }
          >
            <Layers size={15} aria-hidden="true" />
            Generate Default Classes
          </button>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <form className="student-form" onSubmit={submit}>
          <div>
            <label className="form-field-label" htmlFor="cr-class">
              Class
            </label>
            <input
              id="cr-class"
              placeholder="e.g. 10"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="cr-section">
              Section
            </label>
            <input
              id="cr-section"
              placeholder="e.g. A"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="cr-year">
              Academic Year
            </label>
            <select
              id="cr-year"
              value={form.academicYear}
              onChange={(e) =>
                setForm({ ...form, academicYear: e.target.value })
              }
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
            <label className="form-field-label" htmlFor="cr-capacity">
              Capacity (optional)
            </label>
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
            <div>
              <label className="form-field-label" htmlFor="cr-submit">
                &nbsp;
              </label>

              <button
                id="cr-submit"
                type="submit"
                className="button button-primary"
                style={{ width: "100%" }}
              >
                <PlusCircle size={15} aria-hidden="true" />
                Create Classroom
              </button>
            </div>
          </div>
        </form>
      </section>
      <section className="dashboard-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>All Classrooms</h2>
            <p>
              {rooms?.length ?? 0} classroom{rooms?.length === 1 ? "" : "s"}{" "}
              configured.
            </p>
          </div>
          {rooms && rooms.length > 6 && (
            <div className="search-field" style={{ maxWidth: 260 }}>
              <label htmlFor="classroom-search" className="sr-only">
                Search classrooms
              </label>
              <Search size={15} aria-hidden="true" />
              <input
                id="classroom-search"
                type="search"
                placeholder="Search class, section, year..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
        {rooms === null ? (
          <div className="skeleton-rows">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="skeleton" key={i} />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={School}
            title="No classrooms yet"
            message="Create your first classroom above, or generate the standard set (Classes 1–12, Sections A–C) in one click."
          />
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching classrooms"
            message={`Nothing matches "${search}". Try a different class, section, or academic year.`}
          />
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
                {filteredRooms.map((r) => {
                  const full = r.capacity && r.studentCount >= r.capacity;
                  return (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.className}</strong>
                      </td>
                      <td>{r.section}</td>
                      <td>{r.academicYear?.name}</td>
                      <td>{r.capacity ?? "—"}</td>
                      <td>
                        <span
                          className={full ? "status-badge" : ""}
                          style={
                            full
                              ? {
                                  background: "var(--warning-soft)",
                                  color: "var(--warning)",
                                }
                              : undefined
                          }
                        >
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

      <Modal
        isOpen={confirmGenerate}
        onClose={() => !generating && setConfirmGenerate(false)}
        busy={generating}
        title="Generate Default Classes"
      >
        <div className="delete-modal-content">
          <p>
            This creates Classes 1–12, each with Sections A, B, and C (36
            total), for{" "}
            <strong>
              {selectedYear?.name || "the selected academic year"}
            </strong>
            .
          </p>
          <p className="warning-text">
            Any class/section combination that already exists for this year will
            be skipped — nothing gets duplicated or overwritten. You can still
            add non-standard sections (like a 4th section) manually afterward.
          </p>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setConfirmGenerate(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={generating}
              onClick={runGenerateDefaults}
            >
              Generate 36 Classrooms
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
