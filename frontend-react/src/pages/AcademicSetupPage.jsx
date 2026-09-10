import { useEffect, useState } from "react";
import { BookOpen, Layers } from "lucide-react";
import { getSubjects, createSubject } from "../api/subjects";
import { getGradingTerms, createGradingTerm } from "../api/gradingTerms";
import { getAcademicYears } from "../api/academicYears";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function AcademicSetupPage() {
  const [subjects, setSubjects] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [subjectError, setSubjectError] = useState("");

  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState(null);
  const [termForm, setTermForm] = useState({ academicYear: "", name: "", weightPercent: "" });
  const [termError, setTermError] = useState("");

  const loadSubjects = () => getSubjects().then((r) => setSubjects(r.data));
  const loadTerms = () => getGradingTerms().then((r) => setTerms(r.data));

  useEffect(() => {
    loadSubjects();
    loadTerms();
    getAcademicYears().then((r) => setAcademicYears(r.data));
  }, []);

  const submitSubject = async (e) => {
    e.preventDefault();
    setSubjectError("");
    try {
      await createSubject(subjectForm);
      setSubjectForm({ name: "", code: "" });
      loadSubjects();
    } catch (err) {
      setSubjectError(getApiErrorMessage(err, "Unable to create subject."));
    }
  };

  const submitTerm = async (e) => {
    e.preventDefault();
    setTermError("");
    if (!termForm.academicYear) {
      setTermError("Academic year is required.");
      return;
    }
    try {
      await createGradingTerm({ ...termForm, weightPercent: Number(termForm.weightPercent) });
      setTermForm((f) => ({ ...f, name: "", weightPercent: "" }));
      loadTerms();
    } catch (err) {
      setTermError(getApiErrorMessage(err, "Unable to create grading term."));
    }
  };

  const yearName = (id) => academicYears.find((y) => y._id === id)?.name || "";

  return (
    <main className="page page-narrow">
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>
              <BookOpen size={16} style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />
              Subjects
            </h2>
          </div>
        </div>
        {subjectError && <div className="inline-error">{subjectError}</div>}
        <form className="student-form" onSubmit={submitSubject}>
          <div>
            <label className="form-field-label" htmlFor="subj-name">Name</label>
            <input
              id="subj-name"
              placeholder="Mathematics"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="subj-code">Code (optional)</label>
            <input
              id="subj-code"
              placeholder="MATH"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="subj-submit">&nbsp;</label>
            <button id="subj-submit" type="submit" className="button button-primary" style={{ width: "100%" }}>
              Add Subject
            </button>
          </div>
        </form>
        {subjects === null ? (
          <div className="skeleton-rows"><div className="skeleton" /></div>
        ) : subjects.length === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects yet" message="Add your first subject above." />
        ) : (
          <div className="chip-row">
            {subjects.map((s) => (
              <span className="chip" key={s._id}>{s.name}{s.code ? ` (${s.code})` : ""}</span>
            ))}
          </div>
        )}
      </section>

      <section className="form-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>
              <Layers size={16} style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />
              Grading Terms
            </h2>
            <p>e.g. Unit Test 1 (20%), Mid-Term (30%), Final (50%) — weights should add to 100 per academic year.</p>
          </div>
        </div>
        {termError && <div className="inline-error">{termError}</div>}
        <form className="student-form" onSubmit={submitTerm}>
          <div>
            <label className="form-field-label" htmlFor="term-year">Academic Year</label>
            <select
              id="term-year"
              value={termForm.academicYear}
              onChange={(e) => setTermForm({ ...termForm, academicYear: e.target.value })}
            >
              <option value="">Select academic year</option>
              {academicYears.map((y) => (
                <option key={y._id} value={y._id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="term-name">Term Name</label>
            <input
              id="term-name"
              placeholder="Mid-Term"
              value={termForm.name}
              onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="term-weight">Weight %</label>
            <input
              id="term-weight"
              type="number"
              min="1"
              max="100"
              placeholder="30"
              value={termForm.weightPercent}
              onChange={(e) => setTermForm({ ...termForm, weightPercent: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="term-submit">&nbsp;</label>
            <button id="term-submit" type="submit" className="button button-primary" style={{ width: "100%" }}>
              Add Term
            </button>
          </div>
        </form>
        {terms === null ? (
          <div className="skeleton-rows"><div className="skeleton" /></div>
        ) : terms.length === 0 ? (
          <EmptyState icon={Layers} title="No grading terms yet" message="Add your first grading term above." />
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr><th>Term</th><th>Academic Year</th><th>Weight</th></tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t._id}>
                    <td><strong>{t.name}</strong></td>
                    <td>{yearName(t.academicYear)}</td>
                    <td>{t.weightPercent}%</td>
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
