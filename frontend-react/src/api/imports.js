import apiClient from "./client";

// Multipart upload: axios would JSON-encode a FormData body under the
// client's default JSON content type, so it is overridden explicitly here
// (the browser then adds the multipart boundary itself).
const MULTIPART = { "Content-Type": "multipart/form-data" };

// Step 1: upload the CSV to the backend, which validates it and starts the
// import in the background. Resolves with { success, data: { jobId, ... } }.
export const startCsvImport = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post("/students/import-jobs", formData, { headers: MULTIPART, timeout: 60000 });
};

// Step 2: poll the job's progress.
export const getImportJobStatus = (jobId) => apiClient.get(`/students/import-jobs/${jobId}`);

// Step 3 (optional): CSV of every row that was rejected or failed to import.
export const downloadImportErrorReport = (jobId) =>
  apiClient.get(`/students/import-jobs/${jobId}/error-report`, { responseType: "blob" });
