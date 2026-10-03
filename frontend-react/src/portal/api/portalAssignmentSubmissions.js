import portalClient from "./portalClient";

// A student submitting their own work. The backend resolves the student from
// their session, so only the file is sent. Multipart upload: axios would
// JSON-encode a FormData body under the client's default JSON content type,
// so it is overridden explicitly (the browser adds the multipart boundary).
export const submitAssignment = (assignmentId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return portalClient.post(`/assignment-submissions/assignment/${assignmentId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
};
