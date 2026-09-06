import { useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { useStartBackgroundImport, useImportJobStatus, useInvalidateStudentsAfterImport } from "../../hooks/useBackgroundImport";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

export default function BackgroundImportModal({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const [jobId, setJobId] = useState(null);
  const [startError, setStartError] = useState(null);

  const startImport = useStartBackgroundImport();
  const jobStatus = useImportJobStatus(jobId);
  const invalidateStudents = useInvalidateStudentsAfterImport();

  const job = jobStatus.data?.data;
  const isTerminal = job?.status === "completed" || job?.status === "failed";

  // Refresh the student list/dashboard exactly once, right when the job
  // finishes — not on every poll tick.
  const notifiedRef = useRef(false);
  if (isTerminal && !notifiedRef.current) {
    notifiedRef.current = true;
    invalidateStudents();
  }

  const handleClose = () => {
    setJobId(null);
    setStartError(null);
    notifiedRef.current = false;
    onClose();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStartError(null);
    try {
      const newJobId = await startImport.mutateAsync(file);
      setJobId(newJobId);
    } catch (err) {
      setStartError(getApiErrorMessage(err, "Unable to start the import."));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import (background)">
      <div className="background-import-content">
        {!jobId && (
          <>
            <p>
              For large files (hundreds of students), this uploads directly to
              storage and processes in the background — you can navigate away
              and check back.
            </p>
            <Button
              variant="secondary"
              loading={startImport.isPending}
              onClick={() => inputRef.current?.click()}
            >
              Choose CSV file
            </Button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
            {startError && (
              <div className="mutation-error" role="alert">
                {startError}
              </div>
            )}
          </>
        )}

        {jobId && !job && jobStatus.isLoading && (
          <p>
            <Loader2 size={14} className="spin" aria-hidden="true" /> Starting up...
          </p>
        )}

        {job && !isTerminal && (
          <div className="import-progress">
            <p>
              <Loader2 size={14} className="spin" aria-hidden="true" /> Processing...
            </p>
            {job.queuedCount != null && (
              <p>
                {job.processedCount} of {job.queuedCount} rows processed
              </p>
            )}
          </div>
        )}

        {job?.status === "completed" && (
          <div className="import-result">
            <p className="csv-row-ok">
              <CheckCircle2 size={16} aria-hidden="true" /> Import finished.
            </p>
            <p>
              {job.successCount} of {job.queuedCount} rows created successfully.
            </p>
            {job.failureCount > 0 && (
              <p className="csv-row-issues">
                <AlertCircle size={14} aria-hidden="true" /> {job.failureCount} row(s) failed after being queued.
              </p>
            )}
            {job.errorCount > 0 && (
              <p className="csv-row-issues">
                <AlertCircle size={14} aria-hidden="true" /> {job.errorCount} row(s) were rejected before queuing.
                {job.errorReportUrl && (
                  <>
                    {" "}
                    <a href={job.errorReportUrl} target="_blank" rel="noreferrer">
                      Download the error report
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {job?.status === "failed" && (
          <div className="import-result">
            <p className="csv-row-issues">
              <AlertCircle size={16} aria-hidden="true" /> Import failed: {job.errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        <div className="modal-actions">
          <Button variant="secondary" onClick={handleClose}>
            {isTerminal || !jobId ? "Close" : "Close (keeps running in background)"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
