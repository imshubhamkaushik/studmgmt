import { AppError } from "../utils/AppError.js";
import { STUDENT_STATUSES } from "../utils/student-statuses.js";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseStudentDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(DATE_ONLY_PATTERN);

  if (match) {
    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  return null;
};

const normalizeStudentPayload = (payload = {}) => {
  const normalized = {};

  if (payload.name !== undefined) {
    normalized.name =
      typeof payload.name === "string" ? payload.name.trim() : payload.name;
  }

  if (payload.rollNo !== undefined) {
    normalized.rollNo =
      typeof payload.rollNo === "string" && payload.rollNo.trim() !== ""
        ? Number(payload.rollNo)
        : payload.rollNo;
  }

  if (payload.class !== undefined) {
    normalized.class =
      typeof payload.class === "string" ? payload.class.trim() : payload.class;
  }

  if (payload.section !== undefined) {
    normalized.section =
      typeof payload.section === "string" ? payload.section.trim() : payload.section;
  }

  if (payload.status !== undefined) {
    normalized.status = typeof payload.status === "string" ? payload.status.trim().toLowerCase() : payload.status;
  }

  if (payload.dob !== undefined) {
    normalized.dob = parseStudentDate(payload.dob);
  }

  if (payload.expectedUpdatedAt !== undefined) normalized.expectedUpdatedAt = payload.expectedUpdatedAt;

  return normalized;
};

const validateStudentFields = (student, { partial = false } = {}) => {
  const fields = ["name", "rollNo", "class", "section", "dob"];

  if (!partial) {
    for (const field of fields) {
      if (student[field] === undefined) {
        throw new AppError(`${field} is required.`, 400);
      }
    }
  }

  if (student.name !== undefined) {
    if (
      typeof student.name !== "string" ||
      student.name.length < 2 ||
      student.name.length > 100
    ) {
      throw new AppError("Name must be between 2 and 100 characters.", 400);
    }
  }

  if (student.rollNo !== undefined) {
    if (
      typeof student.rollNo !== "number" ||
      !Number.isInteger(student.rollNo) ||
      student.rollNo < 1
    ) {
      throw new AppError("Roll number must be a positive integer.", 400);
    }
  }

  if (student.class !== undefined) {
    if (
      typeof student.class !== "string" ||
      student.class.length < 1 ||
      student.class.length > 50
    ) {
      throw new AppError("Class must be between 1 and 50 characters.", 400);
    }
  }

  if (student.section !== undefined) {
    if (typeof student.section !== "string" || student.section.length < 1 || student.section.length > 20) {
      throw new AppError("Section must be between 1 and 20 characters.", 400);
    }
  }

  if (student.status !== undefined && !STUDENT_STATUSES.includes(student.status)) {
    throw new AppError(`Status must be one of: ${STUDENT_STATUSES.join(", ")}.`, 400);
  }

  if (student.dob !== undefined) {
    if (!(student.dob instanceof Date) || Number.isNaN(student.dob.getTime())) {
      throw new AppError("Date of birth must be a valid date.", 400);
    }

    if (student.dob > new Date()) {
      throw new AppError("Date of birth cannot be in the future.", 400);
    }
  }
};

export const normalizeAndValidateStudentPayload = (payload, { partial = false } = {}) => {
  validateAllowedFields(payload);
  const student = normalizeStudentPayload(payload);
  validateStudentFields(student, { partial });
  if (partial && Object.keys(student).length === 0) {
    throw new AppError("At least one field is required for update.", 400);
  }
  return student;
};

export const validateCreateStudent = (req, res, next) => {
  const student = normalizeAndValidateStudentPayload(req.body);

  req.body = student;

  next();
};

export const validateUpdateStudent = (req, res, next) => {
  const student = normalizeAndValidateStudentPayload(req.body, { partial: true });

  req.body = student;

  next();
};

const ALLOWED_STUDENT_FIELDS = new Set(["name", "rollNo", "class", "section", "status", "dob", "expectedUpdatedAt"]);

const validateAllowedFields = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError("Request body must be a JSON object.", 400);
  }

  for (const field of Object.keys(payload)) {
    if (!ALLOWED_STUDENT_FIELDS.has(field)) {
      throw new AppError(`Field "${field}" is not allowed.`, 400);
    }
  }
};
