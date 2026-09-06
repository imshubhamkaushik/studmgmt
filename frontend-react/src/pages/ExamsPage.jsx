import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, PlusCircle } from "lucide-react";
import { getAcademicYears } from "../api/academicYears";
import { getClassrooms } from "../api/classrooms";
import { getSubjects } from "../api/subjects";
import { getGradingTerms } from "../api/gradingTerms";
import { getExams, createExam } from "../api/exams";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiErrorMessage";
import { useToast } from "../hooks/useToast";

const emptyForm = {
  academicYear: "",
  classroom: "",
  subject: "",
  gradingTerm: "",
  name: "",
  examDate: "",
  maxMarks: "",
  passMarks: "",
};

export default function ExamsPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [exams, setExams] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  const loadExams = () => getExams().then((r) => setExams(r.data));

  useEffect(() => {
    Promise.all([getAcademicYears(), getClassrooms({ includeInactive: "true" }), getSubjects(), getGradingTerms()]).then(
      ([yearsRes, roomsRes, subjectsRes, termsRes]) => {
        setAcademicYears(yearsRes.data);
        setClassrooms(roomsRes.data);
        setSubjects(subjectsRes.data);
        setTerms(termsRes.data);
      },
    );
    loadExams();
  }, []);

  const availableTerms = useMemo(
    () => terms.filter((t) => String(t.academicYear) === String(form.academicYear)),
    [terms, form.academicYear],
  );

  const submit = async (e) => {
    e.preventDefault();
    const { academicYear, classroom, subject, gradingTerm, name, examDate, maxMarks } = form;
    if (!academicYear || !classroom || !subject || !gradingTerm || !name || !examDate || !maxMarks) {
      show("Academic year, classroom, subject, grading term, name, date, and max marks are all required.", "error");
      return;
    }
    setSaving(true);
    try {
      await createExam({ ...form, maxMarks: Number(form.maxMarks), passMarks: form.passMarks ? Number(form.passMarks) : undefined });
      show("Exam created.");
      setForm((f) => ({ ...emptyForm, academicYear: f.academicYear, classroom: f.classroom }));
      loadExams();
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to create exam."), "error");
    } finally {
      setSaving(false);
    }
  };

  const roomLabel = (id) => {
    const room = classrooms.find((c) => c._id === id);
    return room ? `${room.className} ${room.section}` : "";
  };

  return (
    <main className="page page-narrow">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Grading</p>
          <h1>Exams</h1>
          <p>Create exams per classroom and grading term. Mark Entry uses these.</p>
        </div>
      </div>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>
              <FileSpreadsheet size={16} style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />
              New Exam
            </h2>
          </div>
        </div>
        <form className="student-form" onSubmit={submit}>
          <div>
            <label className="form-field-label" htmlFor="exam-year">Academic Year</label>
            <select id="exam-year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value, gradingTerm: "" })}>
              <option value="">Select academic year</option>
              {academicYears.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-room">Classroom</label>
            <select id="exam-room" value={form.classroom} onChange={(e) => setForm({ ...form, classroom: e.target.value })}>
              <option value="">Select classroom</option>
              {classrooms.map((c) => <option key={c._id} value={c._id}>{c.className} {c.section}</option>)}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-subject">Subject</label>
            <select id="exam-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-term">Grading Term</label>
            <select id="exam-term" value={form.gradingTerm} onChange={(e) => setForm({ ...form, gradingTerm: e.target.value })} disabled={!form.academicYear}>
              <option value="">{form.academicYear ? "Select grading term" : "Select academic year first"}</option>
              {availableTerms.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.weightPercent}%)</option>)}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-name">Exam Name</label>
            <input id="exam-name" placeholder="Mid-Term Mathematics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-date">Exam Date</label>
            <input id="exam-date" type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-max">Max Marks</label>
            <input id="exam-max" type="number" min="1" placeholder="100" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-pass">Pass Marks (optional)</label>
            <input id="exam-pass" type="number" min="0" placeholder="35" value={form.passMarks} onChange={(e) => setForm({ ...form, passMarks: e.target.value })} />
          </div>
          <div>
            <label className="form-field-label" htmlFor="exam-submit">&nbsp;</label>
            <button id="exam-submit" type="submit" className="button button-primary" style={{ width: "100%" }} disabled={saving}>
              <PlusCircle size={15} aria-hidden="true" />
              Create Exam
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>All Exams</h2>
            <p>{exams?.length ?? 0} exam{exams?.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        {exams === null ? (
          <div className="skeleton-rows">{Array.from({ length: 3 }).map((_, i) => <div className="skeleton" key={i} />)}</div>
        ) : exams.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="No exams yet" message="Create your first exam above, then head to Mark Entry." />
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr><th>Name</th><th>Classroom</th><th>Subject</th><th>Term</th><th>Date</th><th>Max Marks</th></tr>
              </thead>
              <tbody>
                {exams.map((e) => (
                  <tr key={e._id}>
                    <td><strong>{e.name}</strong></td>
                    <td>{e.classroom?.className ? `${e.classroom.className} ${e.classroom.section}` : roomLabel(e.classroom)}</td>
                    <td>{e.subject?.name}</td>
                    <td>{e.gradingTerm?.name}</td>
                    <td>{new Date(e.examDate).toLocaleDateString()}</td>
                    <td>{e.maxMarks}</td>
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
