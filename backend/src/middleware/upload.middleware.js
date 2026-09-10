import multer from "multer";
import path from "node:path";
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

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError("Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, ZIP, plain text, PNG/JPEG/WEBP images.", 400));
    return;
  }
  cb(null, true);
}

// Keeps the file in memory (req.file.buffer) rather than writing it to
// local disk. Two of this app's three upload flows use this: a teacher
// attaching reference material to an assignment, and staff recording a
// submission on a student's behalf — in both cases the backend receives
// the whole file in one multipart request and immediately forwards the
// buffer to S3 with a PutObjectCommand (see utils/s3-storage.js), so
// nothing is ever persisted to the container's local filesystem for
// those two flows, and there's no PersistentVolume to keep in sync
// across replicas for them.
//
// The third flow — generated report-card PDFs — is the one exception,
// still on local disk (see report-card.service.js's absoluteUploadPath
// usage below) because its integration test exercises a full
// generate-then-download round trip and this project's CI has no
// S3/LocalStack mock to satisfy a real S3 call against.
export function uploadMemory(fieldName = "file") {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    fileFilter,
  }).single(fieldName);

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
