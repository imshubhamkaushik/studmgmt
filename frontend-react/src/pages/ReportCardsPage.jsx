import { useEffect, useState } from "react";
import { FileText, Download, Sparkles, FolderDown } from "lucide-react";
import { getAcademicYears } from "../api/academicYears";
import { getClassrooms } from "../api/classrooms";
import {
  generateClassroomReportCards,
  downloadGeneratedReportCard,
  downloadClassroomReportCardsZip,
} from "../api/reportCards";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiErrorMessage";
import { useToast } from "../hooks/useToast";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportCardsPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [classroomId, setClassroomId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    getAcademicYears().then((r) => setAcademicYears(r.data));
    getClassrooms({ includeInactive: "true" }).then((r) => setClassrooms(r.data));
  }, []);

  const generate = async () => {
    if (!classroomId || !academicYearId) {
      show("Select a classroom and academic year first.", "error");
      return;
    }
    setGenerating(true);
    setResults(null);
    try {
      const res = await generateClassroomReportCards(classroomId, academicYearId);
      setResults(res.data);
      show(res.message || "Report cards generated.");
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to generate report cards."), "error");
    } finally {
      setGenerating(false);
    }
  };

  const download = async (studentId, studentName) => {
    setDownloadingId(studentId);
    try {
      const blob = await downloadGeneratedReportCard(studentId, academicYearId);
      triggerDownload(blob, `report-card-${studentName.replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to download this report card."), "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAll = async () => {
    setDownloadingZip(true);
    try {
      const blob = await downloadClassroomReportCardsZip(classroomId, academicYearId);
      const room = classrooms.find((c) => c._id === classroomId);
      const label = room ? `${room.className}-${room.section}` : classroomId;
      triggerDownload(blob, `report-cards-${label}.zip`);
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to download report cards."), "error");
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <main className="page page-narrow">
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>
              <FileText size={16} style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }} aria-hidden="true" />
              Generate for a Classroom
            </h2>
            <p>Combines every graded term so far into one weighted report — safe to re-run as more grading terms close.</p>
          </div>
        </div>
        <div className="student-form">
          <div>
            <label className="form-field-label" htmlFor="rc-year">Academic Year</label>
            <select id="rc-year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">Select academic year</option>
              {academicYears.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="rc-room">Classroom</label>
            <select id="rc-room" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <option value="">Select classroom</option>
              {classrooms.map((c) => <option key={c._id} value={c._id}>{c.className} {c.section}</option>)}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="rc-generate">&nbsp;</label>
            <button id="rc-generate" type="button" className="button button-primary" style={{ width: "100%" }} onClick={generate} disabled={generating}>
              <Sparkles size={15} aria-hidden="true" />
              {generating ? "Generating..." : "Generate Report Cards"}
            </button>
          </div>
        </div>
      </section>

      {results && (
        <section className="dashboard-card" style={{ marginTop: 18 }}>
          <div className="section-heading">
            <div>
              <h2>Generated</h2>
              <p>{results.length} report card{results.length === 1 ? "" : "s"} ready to download.</p>
            </div>
            {results.length > 0 && (
              <button
                type="button"
                className="button button-secondary"
                onClick={downloadAll}
                disabled={downloadingZip}
              >
                <FolderDown size={14} aria-hidden="true" />
                {downloadingZip ? "Preparing ZIP…" : "Download All (ZIP)"}
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <EmptyState icon={FileText} title="No active enrollments" message="This classroom has no active students for the selected academic year." />
          ) : (
            <div className="table-wrapper">
              <table className="student-table">
                <thead>
                  <tr><th>Student</th><th>Overall</th><th></th></tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.studentId}>
                      <td><strong>{r.studentName}</strong></td>
                      <td>{r.overallPercent != null ? `${r.overallPercent}%` : "Not yet graded"}</td>
                      <td>
                        <button
                          type="button"
                          className="button button-small button-secondary"
                          onClick={() => download(r.studentId, r.studentName)}
                          disabled={downloadingId === r.studentId}
                        >
                          <Download size={13} aria-hidden="true" />
                          Download
                        </button>
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
