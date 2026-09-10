import { useEffect, useState } from "react";
import { GraduationCap, Save } from "lucide-react";
import { getExams } from "../api/exams";
import { getExamRoster, saveMarks } from "../api/markEntry";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiErrorMessage";
import { useToast } from "../hooks/useToast";

export default function MarkEntryPage() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastExamId, setLastExamId] = useState(examId);
  const { show } = useToast();

  // Clearing the roster when the exam selection is cleared is a state
  // adjustment derived from `examId`, not a synchronization with an
  // external system — so it belongs during render (React's recommended
  // pattern for "resetting state when a value changes"), not as a
  // setState call inside an Effect body.
  if (examId !== lastExamId) {
    setLastExamId(examId);
    if (!examId) {
      setExam(null);
      setRows(null);
    }
  }

  useEffect(() => {
    getExams().then((r) => setExams(r.data));
  }, []);

  useEffect(() => {
    if (!examId) return;
    getExamRoster(examId)
      .then((res) => {
        setExam(res.data.exam);
        setRows(
          res.data.roster.map((r) => ({
            studentId: r.student._id,
            name: r.student.name,
            rollNo: r.rollNo,
            marksObtained: r.mark?.marksObtained ?? "",
            isAbsent: r.mark?.isAbsent ?? false,
            remarks: r.mark?.remarks ?? "",
          })),
        );
      })
      .catch((err) => show(getApiErrorMessage(err, "Unable to load roster."), "error"));
  }, [examId, show]);

  const updateRow = (studentId, patch) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const entries = rows.map((r) => ({
        studentId: r.studentId,
        isAbsent: r.isAbsent,
        marksObtained: r.isAbsent ? undefined : Number(r.marksObtained),
        remarks: r.remarks,
      }));
      await saveMarks(examId, entries);
      show("Marks saved.");
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to save marks. Check every non-absent row has a valid mark."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page page-narrow">
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>
              <GraduationCap size={16} style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />
              Select Exam
            </h2>
          </div>
        </div>
        <select value={examId} onChange={(e) => setExamId(e.target.value)} style={{ maxWidth: 420 }}>
          <option value="">Select an exam...</option>
          {exams.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name} — {e.classroom?.className} {e.classroom?.section} — {e.subject?.name}
            </option>
          ))}
        </select>
      </section>

      {examId && (
        <section className="dashboard-card" style={{ marginTop: 18 }}>
          <div className="section-heading">
            <div>
              <h2>{exam?.name}</h2>
              <p>Max marks: {exam?.maxMarks}. Mark a student absent to skip their score.</p>
            </div>
            <button type="button" className="button button-primary" onClick={submit} disabled={saving || !rows?.length}>
              <Save size={15} aria-hidden="true" />
              Save All
            </button>
          </div>

          {rows === null ? (
            <div className="skeleton-rows">{Array.from({ length: 4 }).map((_, i) => <div className="skeleton" key={i} />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No students enrolled" message="This classroom has no active enrollments for this academic year." />
          ) : (
            <div className="table-wrapper">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Student</th>
                    <th>Marks (/ {exam?.maxMarks})</th>
                    <th>Absent</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.studentId}>
                      <td>{r.rollNo}</td>
                      <td><strong>{r.name}</strong></td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={exam?.maxMarks}
                          value={r.marksObtained}
                          disabled={r.isAbsent}
                          onChange={(e) => updateRow(r.studentId, { marksObtained: e.target.value })}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={r.isAbsent}
                          onChange={(e) => updateRow(r.studentId, { isAbsent: e.target.checked, marksObtained: "" })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Optional"
                          value={r.remarks}
                          onChange={(e) => updateRow(r.studentId, { remarks: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
