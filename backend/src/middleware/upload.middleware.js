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

// Keeps the file in memory (req.file.buffer). The service layer then writes
// the buffer to backend/uploads/ via utils/file-storage.js. Used for a
// teacher attaching reference material to an assignment, and for a
// submission (staff on a student's behalf, or the student via the portal).
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

const CSV_MIME_TYPES = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"]);
const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5MB

// Memory upload for the bulk student CSV import. Browsers (especially on
// Windows) report .csv files under several MIME types, so the extension is
// accepted as well.
export function uploadCsvMemory(fieldName = "file") {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_CSV_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      const looksLikeCsv = CSV_MIME_TYPES.has(file.mimetype) || /\.csv$/i.test(file.originalname || "");
      if (!looksLikeCsv) return cb(new AppError("Only .csv files can be imported.", 400));
      return cb(null, true);
    },
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE")
          return next(new AppError("CSV file is too large. Maximum size is 5MB.", 400));
        return next(new AppError(`Upload error: ${err.message}`, 400));
      }
      return next(err);
    });
  };
}
