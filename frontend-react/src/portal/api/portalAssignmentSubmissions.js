import portalClient from "./portalClient";

export const requestUploadUrl = (assignmentId, { originalName, mimeType }) =>
  portalClient.post(`/assignment-submissions/assignment/${assignmentId}/upload-url`, {
    originalName,
    mimeType,
  });

// The presigned POST goes straight to S3, not through our API — there's
// nothing for our backend to do with the bytes in this flow (see
// assignment-submission.service.js's requestSubmissionUploadUrlForStudent).
// S3's presigned-POST convention requires every field from `fields` to be
// appended before the file itself, and the file field must be named
// "file" and come last, or S3 rejects the request.
export async function uploadFileToS3({ uploadUrl, fields }, file) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);

  const response = await fetch(uploadUrl, { method: "POST", body: formData });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}). Please try again.`);
  }
}
