import { useEffect, useMemo, useState } from "react";
import { useMarkBulkAttendance } from "../hooks/useAttendance";
import { getStudents, getStudentFilterOptions } from "../api/students";
import { getAttendance } from "../api/attendance";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

const STATUSES = ["present", "absent", "late", "excused"];
const today = () => new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const [date, setDate] = useState(today());
  const [options, setOptions] = useState({ classes: [], sections: [] });
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const mark = useMarkBulkAttendance();

  useEffect(() => { getStudentFilterOptions().then((r) => setOptions(r.data)).catch(() => setOptions({ classes: [], sections: [] })); }, []);
  const filteredSections = useMemo(() => options.sections, [options.sections]);

  const loadStudents = async () => {
    if (!className || !section) return;
    setLoading(true); setLoadError("");
    try {
      const result = await getStudents({ class: className, section, status: "active", limit: 100 });
      const list = result.data || [];
      const existing = await getAttendance({ date, class: className, section });
      const existingByStudent = Object.fromEntries((existing.data || []).map((record) => [record.student?._id || record.student, record.status]));
      setStudents(list);
      setRecords(Object.fromEntries(list.map((student) => [student._id, existingByStudent[student._id] || "present"])));
    } catch (error) { setLoadError(getApiErrorMessage(error, "Unable to load students.")); setStudents([]); }
    finally { setLoading(false); }
  };

  const save = () => {
    if (!students.length) return;
    mark.mutate({ date, class: className, section, records: students.map((student) => ({ studentId: student._id, status: records[student._id] || "present" })) });
  };

  return <div className="attendance-page">
    <section className="form-card attendance-controls">
      <label>Date<input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Class<select value={className} onChange={(e) => { setClassName(e.target.value); setSection(""); }}><option value="">Select class</option>{options.classes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Section<select value={section} onChange={(e) => setSection(e.target.value)}><option value="">Select section</option>{filteredSections.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button className="button button-secondary" onClick={loadStudents} disabled={!className || !section || loading}>{loading ? "Loading..." : "Load Students"}</button>
    </section>
    {loadError && <div className="inline-error"><strong>Unable to load attendance</strong><p>{loadError}</p></div>}
    {students.length > 0 && <section className="dashboard-card attendance-list">
      <div className="section-heading"><div><h2>{className}-{section}</h2><p>{students.length} active students · {date}</p></div><button className="button button-primary" onClick={save} disabled={mark.isPending}>{mark.isPending ? "Saving..." : "Save Attendance"}</button></div>
      {mark.isError && <div className="inline-error"><strong>Save failed</strong><p>{getApiErrorMessage(mark.error, "Unable to save attendance.")}</p></div>}
      {mark.isSuccess && <p className="import-success">Attendance saved successfully.</p>}
      <div className="attendance-table">{students.map((student) => <div className="attendance-row" key={student._id}><div><strong>{student.rollNo}. {student.name}</strong><span>{student.studentId}</span></div><select value={records[student._id] || "present"} onChange={(e) => setRecords((current) => ({ ...current, [student._id]: e.target.value }))}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>)}</div>
    </section>}
  </div>;
}
