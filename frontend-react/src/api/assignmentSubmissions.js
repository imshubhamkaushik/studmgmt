import apiClient from "./client.js";

export const listSubmissions = (assignmentId) =>
  apiClient.get(`/assignment-submissions/assignment/${assignmentId}`);

export const requestSubmissionUploadUrl = (assignmentId, { studentId, originalName, mimeType }) =>
  apiClient.post(`/assignment-submissions/assignment/${assignmentId}/upload-url`, {
    studentId,
    originalName,
    mimeType,
  });

// S3 presigned POST (not PUT, unlike the CSV import flow) — every field
// S3 gave back must be present in the form, and the file itself must be
// appended last or S3 rejects the upload.
export async function uploadSubmissionFile({ uploadUrl, fields, file }) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);

  const response = await fetch(uploadUrl, { method: "POST", body: formData });
  if (!response.ok) throw new Error("Upload to storage failed. Please try again.");
}

export const gradeSubmission = (id, data) =>
  apiClient.patch(`/assignment-submissions/${id}/grade`, data);
