import { AppError } from "../utils/AppError.js";
import { STUDENT_STATUSES } from "../utils/student-statuses.js";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const ALLOWED_STUDENT_FIELDS = new Set([
  "name",
  "rollNo",
  "class",
  "section",
  "status",
  "dob",
  "expectedUpdatedAt",
]);

const REQUIRED_STUDENT_FIELDS = ["name", "rollNo", "class", "section", "dob"];

const parseStudentDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const match = DATE_ONLY_PATTERN.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValidDate ? date : null;
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : value;

const normalizeRollNo = (value) => {
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return value;
};

const normalizeStatus = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const normalizeStudentPayload = (payload = {}) => {
  const normalized = {};

  const normalizers = {
    name: normalizeText,
    rollNo: normalizeRollNo,
    class: normalizeText,
    section: normalizeText,
    status: normalizeStatus,
    dob: parseStudentDate,
    expectedUpdatedAt: (value) => value,
  };

  for (const [field, normalize] of Object.entries(normalizers)) {
    if (payload[field] !== undefined) {
      normalized[field] = normalize(payload[field]);
    }
  }

  return normalized;
};

const validateRequiredFields = (student) => {
  for (const field of REQUIRED_STUDENT_FIELDS) {
    if (student[field] === undefined) {
      throw new AppError(`${field} is required.`, 400);
    }
  }
};

const validateName = (value) => {
  if (value === undefined) {
    return;
  }

  const isValid =
    typeof value === "string" && value.length >= 2 && value.length <= 100;

  if (!isValid) {
    throw new AppError("Name must be between 2 and 100 characters.", 400);
  }
};

const validateRollNo = (value) => {
  if (value === undefined) {
    return;
  }

  const isValid =
    typeof value === "number" && Number.isInteger(value) && value >= 1;

  if (!isValid) {
    throw new AppError("Roll number must be a positive integer.", 400);
  }
};

const validateClass = (value) => {
  if (value === undefined) {
    return;
  }

  const isValid =
    typeof value === "string" && value.length >= 1 && value.length <= 50;

  if (!isValid) {
    throw new AppError("Class must be between 1 and 50 characters.", 400);
  }
};

const validateSection = (value) => {
  if (value === undefined) {
    return;
  }

  const isValid =
    typeof value === "string" && value.length >= 1 && value.length <= 20;

  if (!isValid) {
    throw new AppError("Section must be between 1 and 20 characters.", 400);
  }
};

const validateStatus = (value) => {
  if (value === undefined) {
    return;
  }

  if (!STUDENT_STATUSES.includes(value)) {
    throw new AppError(
      `Status must be one of: ${STUDENT_STATUSES.join(", ")}.`,
      400,
    );
  }
};

const validateDob = (value) => {
  if (value === undefined) {
    return;
  }

  const isValidDate = value instanceof Date && !Number.isNaN(value.getTime());

  if (!isValidDate) {
    throw new AppError("Date of birth must be a valid date.", 400);
  }

  if (value > new Date()) {
    throw new AppError("Date of birth cannot be in the future.", 400);
  }
};

const validateStudentFields = (student, { partial = false } = {}) => {
  if (!partial) {
    validateRequiredFields(student);
  }

  validateName(student.name);
  validateRollNo(student.rollNo);
  validateClass(student.class);
  validateSection(student.section);
  validateStatus(student.status);
  validateDob(student.dob);
};

const validateAllowedFields = (payload) => {
  const isValidPayload =
    payload && typeof payload === "object" && !Array.isArray(payload);

  if (!isValidPayload) {
    throw new AppError("Request body must be a JSON object.", 400);
  }

  for (const field of Object.keys(payload)) {
    if (!ALLOWED_STUDENT_FIELDS.has(field)) {
      throw new AppError(`Field "${field}" is not allowed.`, 400);
    }
  }
};

export const normalizeAndValidateStudentPayload = (
  payload,
  { partial = false } = {},
) => {
  validateAllowedFields(payload);

  const student = normalizeStudentPayload(payload);

  if (partial && Object.keys(student).length === 0) {
    throw new AppError("At least one field is required for update.", 400);
  }

  validateStudentFields(student, { partial });

  return student;
};

export const validateCreateStudent = (req, res, next) => {
  req.body = normalizeAndValidateStudentPayload(req.body);
  next();
};

export const validateUpdateStudent = (req, res, next) => {
  req.body = normalizeAndValidateStudentPayload(req.body, {
    partial: true,
  });

  next();
};
