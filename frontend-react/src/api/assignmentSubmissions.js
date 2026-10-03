import apiClient from "./client.js";

export const listSubmissions = (assignmentId) =>
  apiClient.get(`/assignment-submissions/assignment/${assignmentId}`);

// Staff recording a submission on a student's behalf. Multipart upload:
// axios would JSON-encode a FormData body under the client's default JSON
// content type, so it is overridden explicitly (the browser adds the
// multipart boundary itself).
export const uploadSubmission = (assignmentId, { studentId, file }) => {
  const formData = new FormData();
  formData.append("studentId", studentId);
  formData.append("file", file);
  return apiClient.post(`/assignment-submissions/assignment/${assignmentId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
};

export const gradeSubmission = (id, data) =>
  apiClient.patch(`/assignment-submissions/${id}/grade`, data);
