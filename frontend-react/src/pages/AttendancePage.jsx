import { useEffect, useState } from "react";
import { ClipboardList, SearchX } from "lucide-react";
import { useMarkBulkAttendance } from "../hooks/useAttendance";
import { getStudents, getStudentFilterOptions } from "../api/students";
import { getAttendance } from "../api/attendance";
import { getApiErrorMessage } from "../utils/apiErrorMessage";
import EmptyState from "../components/common/EmptyState";

const STATUSES = ["present", "absent", "late", "excused"];
const today = () => new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const [date, setDate] = useState(today());
  const [classOptions, setClassOptions] = useState([]);
  const [fetchedSections, setFetchedSections] = useState([]);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const mark = useMarkBulkAttendance();
  // Sections are only meaningful once a class is picked; deriving this at
  // render time (rather than resetting state to [] inside the effect below
  // whenever className is cleared) keeps the effect free of any
  // synchronous setState call.
  const sectionOptions = className ? fetchedSections : [];

  // Load the full class list once, unfiltered.
  useEffect(() => {
    getStudentFilterOptions()
      .then((r) => setClassOptions(r.data.classes))
      .catch(() => setClassOptions([]));
  }, []);

  // Re-fetch sections scoped to the selected class so a school with, say,
  // sections A/B/C in Class 11 but only A in Class 6 doesn't show every
  // section for every class.
  useEffect(() => {
    if (!className) {
      return;
    }
    let cancelled = false;
    getStudentFilterOptions({ class: className })
      .then((r) => {
        if (!cancelled) setFetchedSections(r.data.sections);
      })
      .catch(() => {
        if (!cancelled) setFetchedSections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [className]);

  const loadStudents = async () => {
    if (!className || !section) return;
    setLoading(true);
    setLoadError("");
    setHasSearched(true);
    try {
      const result = await getStudents({
        class: className,
        section,
        status: "active",
        limit: 100,
      });
      const list = result.data || [];
      const existing = await getAttendance({ date, class: className, section });
      const existingByStudent = Object.fromEntries(
        (existing.data || []).map((record) => [
          record.student?._id || record.student,
          record.status,
        ]),
      );
      setStudents(list);
      setRecords(
        Object.fromEntries(
          list.map((student) => [
            student._id,
            existingByStudent[student._id] || "present",
          ]),
        ),
      );
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Unable to load students."));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const markAll = (status) =>
    setRecords((current) =>
      Object.fromEntries(Object.keys(current).map((id) => [id, status])),
    );

  const save = () => {
    if (!students.length) return;
    mark.mutate({
      date,
      class: className,
      section,
      records: students.map((student) => ({
        studentId: student._id,
        status: records[student._id] || "present",
      })),
    });
  };

  return (
    <div className="attendance-page">
      <section className="form-card attendance-controls">
        <label>
          Date
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Class
          <select
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setSection("");
            }}
          >
            <option value="">Select class</option>
            {classOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Section
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            disabled={!className}
          >
            <option value="">Select section</option>
            {sectionOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button-secondary"
          onClick={loadStudents}
          disabled={!className || !section || loading}
        >
          {loading ? "Loading..." : "Load Students"}
        </button>
      </section>
      {loadError && (
        <div className="inline-error">
          <strong>Unable to load attendance</strong>
          <p>{loadError}</p>
        </div>
      )}
      {!loading && students.length === 0 && !loadError && (
        <section className="dashboard-card">
          {hasSearched ? (
            <EmptyState
              icon={SearchX}
              title="No active students found"
              message="There are no active students in this class and section. Try a different combination above."
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Load a class to mark attendance"
              message="Pick a date, class, and section above, then click Load Students to get started."
            />
          )}
        </section>
      )}
      {students.length > 0 && (
        <section className="dashboard-card attendance-list">
          <div className="section-heading">
            <div>
              <h2>
                {className}-{section}
              </h2>
              <p>
                {students.length} active students · {date}
              </p>
            </div>
            <div className="attendance-bulk-actions">
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={() => markAll("present")}
              >
                Mark all present
              </button>
              <button
                type="button"
                className="button button-small button-secondary"
                onClick={() => markAll("absent")}
              >
                Mark all absent
              </button>
              <button
                className="button button-primary"
                onClick={save}
                disabled={mark.isPending}
              >
                {mark.isPending ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>
          {mark.isError && (
            <div className="inline-error">
              <strong>Save failed</strong>
              <p>
                {getApiErrorMessage(mark.error, "Unable to save attendance.")}
              </p>
            </div>
          )}
          {mark.isSuccess && (
            <p className="import-success">Attendance saved successfully.</p>
          )}
          <div className="attendance-table">
            {students.map((student) => (
              <div className="attendance-row" key={student._id}>
                <div>
                  <strong>
                    {student.rollNo}. {student.name}
                  </strong>
                  <span>{student.studentId}</span>
                </div>
                <select
                  value={records[student._id] || "present"}
                  onChange={(e) =>
                    setRecords((current) => ({
                      ...current,
                      [student._id]: e.target.value,
                    }))
                  }
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
