import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { AppError } from "../utils/AppError.js";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// A sanitized, random-prefixed filename — never trust the client-supplied
// name for the actual path on disk, only keep it for display purposes
// (stored separately as `originalName` on the document).
function safeStoredFilename(originalName) {
  const ext = path.extname(originalName).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, "");
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}

function storageFor(subfolder) {
  const dir = path.join(UPLOAD_ROOT, subfolder);
  return multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, safeStoredFilename(file.originalname)),
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError("Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, ZIP, plain text, PNG/JPEG/WEBP images.", 400));
    return;
  }
  cb(null, true);
}

export function uploadSingle(subfolder, fieldName = "file") {
  const upload = multer({
    storage: storageFor(subfolder),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    fileFilter,
  }).single(fieldName);

  // Wrap multer's callback-style middleware so multer-specific errors
  // (file too large, wrong field name) become proper AppErrors instead of
  // an unhandled exception reaching the generic error middleware unlabeled.
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE")
          return next(new AppError("File is too large. Maximum size is 15MB.", 400));
        return next(new AppError(`Upload error: ${err.message}`, 400));
      }
      return next(err);
    });
  };
}

export function absoluteUploadPath(storedPath) {
  // storedPath is saved relative to UPLOAD_ROOT; resolve and guard against
  // any path-traversal attempt before it's ever used to read a file.
  const resolved = path.resolve(UPLOAD_ROOT, storedPath);
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep))
    throw new AppError("Invalid file reference.", 400);
  return resolved;
}

export function relativeUploadPath(absolutePath) {
  return path.relative(UPLOAD_ROOT, absolutePath);
}
