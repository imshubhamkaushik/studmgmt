import apiClient from "./client";
import { ApiError } from "./ApiError";
import { getAccessToken } from "../auth/tokenStore";

// Not apiClient: this call goes directly to the Lambda Function URL, a
// different origin from VITE_API_BASE_URL entirely, so it doesn't belong
// on the axios instance built around the backend's baseURL, refresh-token
// interceptor, or response envelope.
const IMPORT_UPLOAD_URL = import.meta.env.VITE_IMPORT_UPLOAD_URL;

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Step 1: ask the Lambda for a presigned S3 URL. The Lambda checks the
// same JWT the rest of the app already uses.
export async function requestCsvUploadUrl() {
  if (!IMPORT_UPLOAD_URL) throw new Error("VITE_IMPORT_UPLOAD_URL is not configured.");

  const token = getAccessToken();

  const response = await fetch(IMPORT_UPLOAD_URL, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const body = await parseJsonSafely(response);

  if (!response.ok) {
    throw new ApiError(body?.message || "Unable to start the import.", {
      status: response.status,
      errors: null,
    });
  }

  return body.data; // { uploadUrl, jobId, key, expiresIn }
}

// Step 2: PUT the raw file straight to S3. The presigned URL itself is
// the authorization here — no app token needed on this request.
export async function uploadCsvFile(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/csv" },
    body: file,
  });

  if (!response.ok) throw new Error("Upload to S3 failed. Please try again.");
}

// Step 3: poll this through the backend, not DynamoDB directly — the
// browser has no AWS credentials, and shouldn't.
export const getImportJobStatus = (jobId) => apiClient.get(`/students/import-jobs/${jobId}`);
