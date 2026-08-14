import { useEffect, useMemo, useState } from "react";
import { getAcademicYears } from "../api/academicYears";
import { getClassrooms } from "../api/classrooms";
import { getEnrollments, promoteStudents } from "../api/enrollments";

const classroomLabel = (room) => `${room.className}-${room.section}`;

export default function PromotionPage() {
  const [years, setYears] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sourceRows, setSourceRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [rollNumbers, setRollNumbers] = useState({});
  const [form, setForm] = useState({ fromAcademicYearId: "", toAcademicYearId: "", toClassroomId: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    Promise.all([getAcademicYears(), getClassrooms({ includeInactive: "true" })])
      .then(([yearResponse, roomResponse]) => {
        setYears(yearResponse.data || []);
        setRooms(roomResponse.data || []);
      })
      .catch((e) => setError(e.message || "Unable to load academic data."));
  }, []);

  const destinationRooms = useMemo(
    () => rooms.filter((room) => String(room.academicYear?._id || room.academicYear) === form.toAcademicYearId && room.isActive !== false),
    [rooms, form.toAcademicYearId],
  );

  const selectedRows = useMemo(
    () => sourceRows.filter((row) => selected.includes(row.student?._id || row.student)),
    [sourceRows, selected],
  );

  const selectedDestination = rooms.find((room) => room._id === form.toClassroomId);
  const capacityRemaining = selectedDestination?.capacity
    ? Math.max(0, selectedDestination.capacity - (selectedDestination.studentCount || 0))
    : null;
  const exceedsCapacity = capacityRemaining !== null && selected.length > capacityRemaining;

  const loadSource = async () => {
    setError("");
    setMessage("");
    setSelected([]);
    setRollNumbers({});
    if (!form.fromAcademicYearId) {
      setSourceRows([]);
      return;
    }
    setLoading(true);
    try {
      const response = await getEnrollments({ academicYear: form.fromAcademicYearId, status: "active" });
      setSourceRows(response.data || []);
    } catch (e) {
      setError(e.message || "Unable to load source enrollments.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleAll = () => {
    const ids = sourceRows.map((row) => row.student?._id || row.student).filter(Boolean);
    setSelected(selected.length === ids.length ? [] : ids);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.fromAcademicYearId || !form.toAcademicYearId || !form.toClassroomId) {
      setError("Select the source academic year, destination academic year, and destination classroom.");
      return;
    }
    if (!selected.length) {
      setError("Select at least one student to promote.");
      return;
    }
    if (exceedsCapacity) {
      setError("The selected students exceed the remaining classroom capacity.");
      return;
    }
    const values = selected.map((id) => Number(rollNumbers[id]));
    if (values.some((value) => !Number.isInteger(value) || value < 1) || new Set(values).size !== values.length) {
      setError("Every selected student needs a unique positive destination roll number.");
      return;
    }
    setPromoting(true);
    try {
      const response = await promoteStudents({
        studentIds: selected,
        fromAcademicYearId: form.fromAcademicYearId,
        toAcademicYearId: form.toAcademicYearId,
        toClassroomId: form.toClassroomId,
        rollNumbers,
      });
      const count = Array.isArray(response.data) ? response.data.length : selected.length;
      setMessage(`${count} student${count === 1 ? "" : "s"} promoted successfully.`);
      await loadSource();
    } catch (e) {
      setError(e.message || "Promotion failed.");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Academic progression</p>
          <h1>Promote Students</h1>
          <p>Move selected active enrollments to a new academic year and classroom while preserving enrollment history.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      <section className="card">
        <form className="student-form" onSubmit={submit}>
          <select value={form.fromAcademicYearId} onChange={(e) => setForm((current) => ({ ...current, fromAcademicYearId: e.target.value }))}>
            <option value="">Source academic year</option>
            {years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadSource} disabled={loading || !form.fromAcademicYearId}>
            {loading ? "Loading..." : "Load Students"}
          </button>
          <select value={form.toAcademicYearId} onChange={(e) => setForm((current) => ({ ...current, toAcademicYearId: e.target.value, toClassroomId: "" }))}>
            <option value="">Destination academic year</option>
            {years.filter((year) => year._id !== form.fromAcademicYearId).map((year) => <option key={year._id} value={year._id}>{year.name}{year.isActive ? " (Active)" : ""}</option>)}
          </select>
          <select value={form.toClassroomId} onChange={(e) => setForm((current) => ({ ...current, toClassroomId: e.target.value }))} disabled={!form.toAcademicYearId}>
            <option value="">Destination classroom</option>
            {destinationRooms.map((room) => <option key={room._id} value={room._id}>{classroomLabel(room)}{room.capacity ? ` (${room.studentCount || 0}/${room.capacity})` : ""}</option>)}
          </select>
          <button className="button primary" disabled={promoting || !selected.length || exceedsCapacity}>
            {promoting ? "Promoting..." : `Promote ${selected.length || "Selected"} Student${selected.length === 1 ? "" : "s"}`}
          </button>
        </form>
        {selectedDestination && <p className="muted-text">Destination capacity: {selectedDestination.capacity ? `${selectedDestination.studentCount || 0}/${selectedDestination.capacity} currently enrolled; ${capacityRemaining} places remaining.` : "No capacity limit configured."}</p>}
      </section>

      <section className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th><input type="checkbox" checked={sourceRows.length > 0 && selected.length === sourceRows.length} onChange={toggleAll} /></th><th>Student</th><th>Student ID</th><th>Current Classroom</th><th>Current Roll</th><th>Destination Roll</th></tr></thead>
            <tbody>
              {!loading && sourceRows.length === 0 && <tr><td colSpan="6">Select a source academic year and load active enrollments.</td></tr>}
              {sourceRows.map((row) => {
                const id = row.student?._id || row.student;
                const checked = selected.includes(id);
                return <tr key={row._id}>
                  <td><input type="checkbox" checked={checked} onChange={() => toggleStudent(id)} /></td>
                  <td>{row.student?.name || "—"}</td>
                  <td>{row.student?.studentId || "—"}</td>
                  <td>{row.classroom ? classroomLabel(row.classroom) : "—"}</td>
                  <td>{row.rollNo}</td>
                  <td><input type="number" min="1" disabled={!checked} value={rollNumbers[id] ?? row.rollNo} onChange={(e) => setRollNumbers((current) => ({ ...current, [id]: e.target.value }))} /></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {selectedRows.length > 0 && <p className="muted-text">Review destination roll numbers before promoting. The server performs final enrollment, capacity, and roll-number conflict checks.</p>}
      </section>
    </main>
  );
}
