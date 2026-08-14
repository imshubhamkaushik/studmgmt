import { AppError } from "../utils/AppError.js";
import { ATTENDANCE_STATUSES } from "../utils/attendance-statuses.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const parseAttendanceDate = (value) => {
  if (typeof value !== "string" || !DATE_RE.test(value))
    throw new AppError("date must use YYYY-MM-DD format.", 400);
  
  const [year, month, day] = value.split("-").map(Number);
  
  const date = new Date(Date.UTC(year, month - 1, day));
  
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new AppError("date is not a valid calendar date.", 400);
  
  const today = new Date();
  
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  
  if (date.getTime() > todayUtc)
    throw new AppError("Attendance cannot be marked for a future date.", 400);
  return date;
};

const parseStatus = (value) => {
  if (
    typeof value !== "string" ||
    !ATTENDANCE_STATUSES.includes(value.toLowerCase())
  )
    throw new AppError(
      `status must be one of: ${ATTENDANCE_STATUSES.join(", ")}.`,
      400,
    );
  
  return value.toLowerCase();
};

export const normalizeBulkAttendance = (body) => {
  const className = typeof body?.class === "string" ? body.class.trim() : "";
  
  const section = typeof body?.section === "string" ? body.section.trim() : "";
  
  if (!className || className.length > 50)
    throw new AppError(
      "class is required and cannot exceed 50 characters.",
      400,
    );
  
  if (!section || section.length > 20)
    throw new AppError(
      "section is required and cannot exceed 20 characters.",
      400,
    );
  
  if (
    !Array.isArray(body?.records) ||
    body.records.length === 0 ||
    body.records.length > 500
  )
    throw new AppError(
      "records must contain between 1 and 500 attendance records.",
      400,
    );
  
  const date = parseAttendanceDate(body.date);
  
  const seen = new Set();
  
  const records = body.records.map((record, index) => {
    const studentId = record?.studentId;
    
    if (!/^[a-fA-F0-9]{24}$/.test(String(studentId || "")))
      throw new AppError(`records[${index}].studentId is invalid.`, 400);
    
    if (seen.has(String(studentId)))
      throw new AppError(
        "Duplicate studentId found in attendance records.",
        400,
      );
    
    seen.add(String(studentId));
    
    return { studentId: String(studentId), status: parseStatus(record.status) };
  });
  
  return { className, section, date, records };
};

export const validateBulkAttendance = (req, _res, next) => {
  try {
    req.body = normalizeBulkAttendance(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
