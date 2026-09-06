import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, UploadCloud } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { getEnrollments } from "../../api/enrollments";
import { useSubmissions, useUploadSubmission, useGradeSubmission } from "../../hooks/useAssignmentSubmissions";
import { useToast } from "../../hooks/useToast";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

const STATUS_LABEL = {
  pending_upload: "Processing…",
  submitted: "Submitted",
  late: "Late",
  rejected: "Rejected",
  graded: "Graded",
};

// Reuses the app's existing status-badge modifier classes where the
// semantics already line up (green="active/graded", red="inactive/
// rejected", blue="graduated/submitted") instead of inventing a parallel
// set of tone classes. Only "late" needs a genuinely new color.
const STATUS_CLASS = {
  pending_upload: "",
  submitted: "status-graduated",
  late: "status-late",
  rejected: "status-inactive",
  graded: "status-active",
};

function StatusBadge({ status }) {
  return <span className={`status-badge ${STATUS_CLASS[status] || ""}`.trim()}>{STATUS_LABEL[status] || status}</span>;
}

function GradeRow({ submission, onGrade, saving }) {
  const [marks, setMarks] = useState(submission.marksObtained ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");

  return (
    <div className="grade-row">
      <input
        type="number"
        min="0"
        placeholder="Marks"
        value={marks}
        onChange={(e) => setMarks(e.target.value)}
        style={{ width: 90 }}
      />
      <input
        type="text"
        placeholder="Feedback (optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button
        variant="secondary"
        loading={saving}
        onClick={() => onGrade({ id: submission._id, marksObtained: marks || null, feedback })}
      >
        Save
      </Button>
    </div>
  );
}

export default function SubmissionsModal({ assignment, onClose }) {
  const [roster, setRoster] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [uploadError, setUploadError] = useState(null);
  const inputRef = useRef(null);
  const { show } = useToast();

  const classroomId = assignment.classroom?._id || assignment.classroom;

  useEffect(() => {
    getEnrollments({ classroom: classroomId, status: "active" })
      .then((res) => setRoster(res.data ?? []))
      .catch(() => setRoster([]));
  }, [classroomId]);

  const submissions = useSubmissions(assignment._id);
  const uploadSubmission = useUploadSubmission(assignment._id);
  const gradeSubmission = useGradeSubmission(assignment._id);

  const items = submissions.data?.data ?? [];
  const submittedStudentIds = new Set(items.map((s) => s.student?._id));
  const availableRoster = roster.filter((e) => !submittedStudentIds.has(e.student?._id));

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedStudent) return;

    setUploadError(null);
    try {
      await uploadSubmission.mutateAsync({ studentId: selectedStudent, file });
      show("Submission uploaded — validating in the background.");
      setSelectedStudent("");
    } catch (err) {
      setUploadError(getApiErrorMessage(err, "Unable to upload this submission."));
    }
  };

  const handleGrade = async (payload) => {
    try {
      await gradeSubmission.mutateAsync(payload);
      show("Grade saved.");
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to save grade."), "error");
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Submissions — ${assignment.title}`}>
      <div className="submissions-modal-content">
        <div className="submissions-upload-row">
          <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
            <option value="">Select a student to upload for...</option>
            {availableRoster.map((e) => (
              <option key={e._id} value={e.student?._id}>
                {e.student?.name} (Roll {e.student?.rollNo})
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={!selectedStudent}
            loading={uploadSubmission.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud size={14} aria-hidden="true" />
            Upload
          </Button>
          <input ref={inputRef} type="file" hidden onChange={handleUpload} />
        </div>
        {uploadError && <div className="inline-error">{uploadError}</div>}

        {submissions.isLoading && (
          <p>
            <Loader2 size={14} className="spin" aria-hidden="true" /> Loading submissions...
          </p>
        )}

        {!submissions.isLoading && items.length === 0 && (
          <p className="notification-empty">No submissions yet.</p>
        )}

        {items.length > 0 && (
          <ul className="submissions-list">
            {items.map((s) => (
              <li key={s._id} className="submission-item">
                <div className="submission-item-header">
                  <span>{s.student?.name} <span style={{ color: "var(--muted)" }}>(Roll {s.student?.rollNo})</span></span>
                  <StatusBadge status={s.status} />
                </div>
                {s.status === "rejected" && s.rejectionReason && (
                  <p className="csv-row-issues">
                    <AlertCircle size={13} aria-hidden="true" /> {s.rejectionReason}
                  </p>
                )}
                {s.status === "pending_upload" && (
                  <p style={{ color: "var(--muted)", fontSize: 12.5 }}>
                    File uploaded, waiting on background validation — refresh in a moment.
                  </p>
                )}
                {(s.status === "submitted" || s.status === "late" || s.status === "graded") && (
                  <GradeRow submission={s} onGrade={handleGrade} saving={gradeSubmission.isPending} />
                )}
                {s.status === "graded" && (
                  <p style={{ color: "var(--success)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={13} aria-hidden="true" /> Graded: {s.marksObtained ?? "—"} / {assignment.maxMarks ?? "—"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
