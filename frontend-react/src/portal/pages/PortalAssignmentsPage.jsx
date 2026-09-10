import { useRef, useState } from "react";
import { CheckCircle2, Clock, Upload, AlertTriangle } from "lucide-react";
import { usePortalAssignments } from "../hooks/usePortalData";
import { useQueryClient } from "@tanstack/react-query";
import { portalQueryKeys } from "../api/portalQueryKeys";
import * as submissionsApi from "../api/portalAssignmentSubmissions";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_LABEL = {
  pending_upload: { label: "Uploading…", icon: Clock, tone: "status-late" },
  submitted: { label: "Submitted", icon: CheckCircle2, tone: "status-active" },
  late: { label: "Submitted late", icon: AlertTriangle, tone: "status-late" },
  rejected: { label: "Rejected — please resubmit", icon: AlertTriangle, tone: "status-inactive" },
  graded: { label: "Graded", icon: CheckCircle2, tone: "status-active" },
};

function AssignmentRow({ assignment }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submission = assignment.submission;
  const overdue = !submission && new Date(assignment.dueDate) < new Date();
  const statusInfo = submission ? STATUS_LABEL[submission.status] : null;

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setBusy(true);
    setError("");
    try {
      const { data } = await submissionsApi.requestUploadUrl(assignment._id, {
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
      });
      await submissionsApi.uploadFileToS3(data, file);
      await queryClient.invalidateQueries({ queryKey: portalQueryKeys.assignments() });
    } catch (err) {
      setError(getApiErrorMessage(err, "Upload failed. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="portal-assignment-row">
      <div className="portal-assignment-main">
        <div>
          <strong>{assignment.title}</strong>
          <span className="portal-list-meta">
            {assignment.subject?.name} · Due {formatDate(assignment.dueDate)}
            {assignment.maxMarks != null ? ` · ${assignment.maxMarks} marks` : ""}
          </span>
        </div>
        {assignment.description && <p className="portal-assignment-description">{assignment.description}</p>}
      </div>

      <div className="portal-assignment-status">
        {statusInfo ? (
          <span className={`status-badge ${statusInfo.tone}`}>
            <statusInfo.icon size={13} aria-hidden="true" />
            {statusInfo.label}
          </span>
        ) : overdue ? (
          <span className="status-badge status-inactive">
            <AlertTriangle size={13} aria-hidden="true" />
            Overdue — not submitted
          </span>
        ) : (
          <span className="status-badge">Not submitted yet</span>
        )}

        {submission?.status === "graded" && (
          <span className="portal-grade">
            {submission.marksObtained}
            {assignment.maxMarks != null ? ` / ${assignment.maxMarks}` : ""}
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelected}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="button button-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <Upload size={14} aria-hidden="true" />
          {busy ? "Uploading…" : submission ? "Resubmit" : "Submit work"}
        </button>
      </div>

      {submission?.feedback && (
        <p className="portal-feedback">
          <strong>Teacher feedback:</strong> {submission.feedback}
        </p>
      )}
      {error && <div className="inline-error">{error}</div>}
    </li>
  );
}

export default function PortalAssignmentsPage() {
  const assignments = usePortalAssignments();
  const items = assignments.data ?? [];

  return (
    <div className="portal-page">
      <div className="page-heading">
        <p className="eyebrow">Coursework</p>
        <h1>Assignments</h1>
        <p>Everything assigned to your current classroom, and your submission status for each.</p>
      </div>

      <section className="form-card">
        {assignments.isLoading && <p>Loading…</p>}
        {assignments.isError && (
          <div className="inline-error">{getApiErrorMessage(assignments.error, "Unable to load assignments.")}</div>
        )}
        {!assignments.isLoading && items.length === 0 && (
          <p className="notification-empty">No assignments yet.</p>
        )}
        {items.length > 0 && (
          <ul className="portal-list portal-assignment-list">
            {items.map((a) => (
              <AssignmentRow key={a._id} assignment={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
