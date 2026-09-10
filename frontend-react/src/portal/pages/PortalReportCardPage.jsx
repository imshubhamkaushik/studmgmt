import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { usePortalProfile } from "../hooks/usePortalData";
import * as portalReportCardApi from "../api/portalReportCard";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

export default function PortalReportCardPage() {
  const profile = usePortalProfile();
  const academicYears = profile.data?.academicYears ?? [];
  const [academicYearId, setAcademicYearId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Default to the active year (or the most recent one) the first time the
  // list loads — a render-time state adjustment rather than an effect,
  // same reasoning as MarkEntryPage's exam-reset logic: this is deriving
  // state from a prop-like value, not synchronizing with anything external.
  if (!academicYearId && academicYears.length > 0) {
    const defaultYear = academicYears.find((y) => y.isActive) || academicYears[0];
    setAcademicYearId(defaultYear._id);
  }

  async function download() {
    if (!academicYearId) return;
    setBusy(true);
    setError("");
    try {
      const blob = await portalReportCardApi.getMyReportCard(academicYearId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "report-card.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Report card is not available yet for this year."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-page">
      <div className="page-heading">
        <p className="eyebrow">Grading</p>
        <h1>Report Card</h1>
        <p>Download a PDF report card for any academic year you were enrolled in.</p>
      </div>

      <section className="form-card">
        {profile.isLoading && <p>Loading…</p>}

        {!profile.isLoading && academicYears.length === 0 && (
          <p className="notification-empty">No enrollment history found yet.</p>
        )}

        {academicYears.length > 0 && (
          <div className="submissions-upload-row">
            <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              {academicYears.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name}
                </option>
              ))}
            </select>
            <button type="button" className="button button-primary" onClick={download} disabled={busy}>
              <Download size={14} aria-hidden="true" />
              {busy ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        )}

        {error && <div className="inline-error">{error}</div>}

        <div className="portal-report-card-preview">
          <FileText size={32} aria-hidden="true" />
          <p>
            Report cards are generated once every grading term is fully graded. If a download fails, it
            usually means grading for the selected year isn&apos;t complete yet — check back after your
            teacher finishes entering marks.
          </p>
        </div>
      </section>
    </div>
  );
}
