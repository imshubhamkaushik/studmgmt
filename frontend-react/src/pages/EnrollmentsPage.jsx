import { useEffect, useMemo, useState } from "react";
import { getStudents } from "../api/students";
import { getAcademicYears } from "../api/academicYears";
import { getClassrooms } from "../api/classrooms";
import { getEnrollments, createEnrollment, promoteStudents } from "../api/enrollments";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

const emptyForm = { studentId: "", academicYearId: "", classroomId: "", rollNo: "" };

export default function EnrollmentsPage() {
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState([]);
  const [sourceYear, setSourceYear] = useState("");
  const [sourceRoom, setSourceRoom] = useState("");
  const [destinationYear, setDestinationYear] = useState("");
  const [destinationRoom, setDestinationRoom] = useState("");
  const [promotionRolls, setPromotionRolls] = useState({});
  const [busy, setBusy] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState("");

  const load = async () => {
    setError("");
    try {
      const [s, y, c, e] = await Promise.all([
        getStudents({ limit: 100 }), getAcademicYears(), getClassrooms({ includeInactive: "true" }), getEnrollments(),
      ]);
      setStudents(s.data.students || s.data || []);
      setYears(y.data || []); setRooms(c.data || []); setRows(e.data || []);
    } catch (e) { setError(getApiErrorMessage(e, "Unable to load enrollment data.")); }
  };
  useEffect(() => { load(); }, []);

  const filteredRooms = (yearId) => rooms.filter((r) => String(r.academicYear?._id || r.academicYear) === String(yearId));
  const enrollmentRows = useMemo(() => rows.filter((r) => r.status === "active"), [rows]);
  const sourceRows = useMemo(() => enrollmentRows.filter((r) => String(r.academicYear?._id || r.academicYear) === sourceYear && (!sourceRoom || String(r.classroom?._id || r.classroom) === sourceRoom)), [enrollmentRows, sourceYear, sourceRoom]);
  const destinationRooms = filteredRooms(destinationYear);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await createEnrollment({ ...form, rollNo: Number(form.rollNo) }); setForm(emptyForm); await load(); }
    catch (e) { setError(getApiErrorMessage(e, "Unable to enroll student.")); }
    finally { setBusy(false); }
  };

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const toggleAll = () => setSelected(selected.length === sourceRows.length ? [] : sourceRows.map((r) => r.student?._id || r.student));

  const promote = async () => {
    if (!selected.length || !sourceYear || !destinationYear || !destinationRoom) return;
    setBusy(true); setError(""); setPromotionMessage("");
    try {
      const result = await promoteStudents({ studentIds: selected, fromAcademicYearId: sourceYear, toAcademicYearId: destinationYear, toClassroomId: destinationRoom, rollNumbers: promotionRolls });
      setPromotionMessage(`${result.data?.length || selected.length} student(s) promoted successfully.`);
      setSelected([]); setPromotionRolls({}); await load();
    } catch (e) { setError(getApiErrorMessage(e, "Promotion failed.")); }
    finally { setBusy(false); }
  };

  return <main className="page">
    <div className="page-heading"><div><p className="eyebrow">Academic placement</p><h1>Enrollments & Promotion</h1><p>Assign students to academic classrooms and move them safely between academic years.</p></div></div>
    {error && <p className="form-error">{error}</p>}
    {promotionMessage && <p className="import-success">{promotionMessage}</p>}

    <section className="card"><div className="section-heading"><div><h2>Enroll a student</h2><p>Create the student's placement for an academic year.</p></div></div>
      <form className="student-form" onSubmit={submit}>
        <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}><option value="">Select active student</option>{students.filter(s => s.status === "active" && !s.isDeleted).map(s => <option key={s._id} value={s._id}>{s.name} ({s.studentId})</option>)}</select>
        <select required value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value, classroomId: "" })}><option value="">Select academic year</option>{years.map(y => <option key={y._id} value={y._id}>{y.name}{y.isActive ? " (Active)" : ""}</option>)}</select>
        <select required value={form.classroomId} onChange={(e) => setForm({ ...form, classroomId: e.target.value })}><option value="">Select classroom</option>{filteredRooms(form.academicYearId).map(r => <option key={r._id} value={r._id}>{r.className}-{r.section}{r.capacity ? ` · ${r.studentCount || 0}/${r.capacity}` : ""}</option>)}</select>
        <input required type="number" min="1" placeholder="Roll number" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })}/>
        <button className="button primary" disabled={busy}>{busy ? "Saving..." : "Enroll Student"}</button>
      </form>
    </section>

    <section className="card"><div className="section-heading"><div><h2>Promote students</h2><p>Select active enrollments from a source year and preview their destination roll numbers.</p></div></div>
      <div className="student-form">
        <select value={sourceYear} onChange={(e) => { setSourceYear(e.target.value); setSourceRoom(""); setSelected([]); }}><option value="">Source academic year</option>{years.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}</select>
        <select value={sourceRoom} onChange={(e) => { setSourceRoom(e.target.value); setSelected([]); }} disabled={!sourceYear}><option value="">All source classrooms</option>{filteredRooms(sourceYear).map(r => <option key={r._id} value={r._id}>{r.className}-{r.section}</option>)}</select>
        <select value={destinationYear} onChange={(e) => { setDestinationYear(e.target.value); setDestinationRoom(""); }}><option value="">Destination academic year</option>{years.filter(y => y._id !== sourceYear).map(y => <option key={y._id} value={y._id}>{y.name}</option>)}</select>
        <select value={destinationRoom} onChange={(e) => setDestinationRoom(e.target.value)} disabled={!destinationYear}><option value="">Destination classroom</option>{destinationRooms.map(r => <option key={r._id} value={r._id}>{r.className}-{r.section}{r.capacity ? ` · ${r.studentCount || 0}/${r.capacity}` : ""}</option>)}</select>
      </div>
      {sourceRows.length > 0 && <div className="table-wrapper"><table><thead><tr><th><input type="checkbox" checked={selected.length === sourceRows.length} onChange={toggleAll}/></th><th>Student</th><th>Source</th><th>Destination Roll</th></tr></thead><tbody>{sourceRows.map(r => { const id = r.student?._id || r.student; const checked = selected.includes(id); return <tr key={r._id}><td><input type="checkbox" checked={checked} onChange={() => toggle(id)}/></td><td>{r.student?.name || "—"} <small>{r.student?.studentId || ""}</small></td><td>{r.classroom ? `${r.classroom.className}-${r.classroom.section}` : "—"}</td><td><input type="number" min="1" disabled={!checked} value={promotionRolls[id] || ""} placeholder="Auto" onChange={e => setPromotionRolls(x => ({ ...x, [id]: e.target.value }))}/></td></tr>; })}</tbody></table></div>}
      <div className="section-actions"><span>{selected.length} selected</span><button className="button button-primary" disabled={busy || !selected.length || !sourceYear || !destinationYear || !destinationRoom} onClick={promote}>{busy ? "Promoting..." : "Promote Selected"}</button></div>
    </section>

    <section className="card"><div className="section-heading"><div><h2>Enrollment history</h2><p>Historical placements are preserved instead of overwriting the student record.</p></div></div><div className="table-wrapper"><table><thead><tr><th>Student</th><th>Academic Year</th><th>Classroom</th><th>Roll No.</th><th>Status</th></tr></thead><tbody>{rows.map(r => <tr key={r._id}><td>{r.student?.name || "—"}</td><td>{r.academicYear?.name || "—"}</td><td>{r.classroom ? `${r.classroom.className}-${r.classroom.section}` : "—"}</td><td>{r.rollNo}</td><td>{r.status}</td></tr>)}</tbody></table></div></section>
  </main>;
}
