import fs from "node:fs/promises";
import path from "node:path";
import { absoluteUploadPath } from "../middleware/upload.middleware.js";
import { AppError } from "./AppError.js";

// All uploaded files (assignment attachments, student submissions, generated
// report cards) live on the local disk under backend/uploads/. `key` values
// are always relative to that folder, e.g. "submissions/<id>/essay.pdf".

// Never trust a client-supplied filename as part of a storage path directly —
// strip it down to a safe character set first. The original name is still
// preserved separately (as `originalName` on the document) for display.
export const sanitizeFilename = (name) => String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);

export async function saveBuffer({ key, buffer }) {
  const target = absoluteUploadPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return key;
}

// Streams a stored file back to the client as a download. Authorization is
// the caller's job and must already have happened.
export async function sendStoredFile(res, { key, originalName, mimeType }) {
  const target = absoluteUploadPath(key);
  try {
    await fs.access(target);
  } catch {
    throw new AppError("The stored file could not be found.", 404);
  }
  if (mimeType) res.type(mimeType);
  await new Promise((resolve, reject) => {
    res.download(target, originalName || path.basename(target), (error) => (error ? reject(error) : resolve()));
  });
}
