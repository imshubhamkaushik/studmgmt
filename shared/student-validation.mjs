// Canonical implementation — backend/src/validators/student.validator.js
// re-exports this rather than defining its own copy, and the
// process-import Lambda imports it directly for CSV row validation. The
// whole point of pulling this out of backend/ is that a row a teacher
// uploads via CSV and a row entered through the API must be judged by
// exactly the same rules, with zero chance of the two silently drifting
// apart after future edits.
export class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const STUDENT_STATUSES = [
  "active",
  "inactive",
  "graduated",
  "transferred",
  "suspended",
];

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
      throw new ValidationError(`${field} is required.`);
    }
  }
};

const validateName = (value) => {
  if (value === undefined) return;
  const isValid = typeof value === "string" && value.length >= 2 && value.length <= 100;
  if (!isValid) throw new ValidationError("Name must be between 2 and 100 characters.");
};

const validateRollNo = (value) => {
  if (value === undefined) return;
  const isValid = typeof value === "number" && Number.isInteger(value) && value >= 1;
  if (!isValid) throw new ValidationError("Roll number must be a positive integer.");
};

const validateClass = (value) => {
  if (value === undefined) return;
  const isValid = typeof value === "string" && value.length >= 1 && value.length <= 50;
  if (!isValid) throw new ValidationError("Class must be between 1 and 50 characters.");
};

const validateSection = (value) => {
  if (value === undefined) return;
  const isValid = typeof value === "string" && value.length >= 1 && value.length <= 20;
  if (!isValid) throw new ValidationError("Section must be between 1 and 20 characters.");
};

const validateStatus = (value) => {
  if (value === undefined) return;
  if (!STUDENT_STATUSES.includes(value))
    throw new ValidationError(`Status must be one of: ${STUDENT_STATUSES.join(", ")}.`);
};

const validateDob = (value) => {
  if (value === undefined) return;
  const isValidDate = value instanceof Date && !Number.isNaN(value.getTime());
  if (!isValidDate) throw new ValidationError("Date of birth must be a valid date.");
  if (value > new Date()) throw new ValidationError("Date of birth cannot be in the future.");
};

const validateStudentFields = (student, { partial = false } = {}) => {
  if (!partial) validateRequiredFields(student);
  validateName(student.name);
  validateRollNo(student.rollNo);
  validateClass(student.class);
  validateSection(student.section);
  validateStatus(student.status);
  validateDob(student.dob);
};

const validateAllowedFields = (payload) => {
  const isValidPayload = payload && typeof payload === "object" && !Array.isArray(payload);
  if (!isValidPayload) throw new ValidationError("Request body must be a JSON object.");

  for (const field of Object.keys(payload)) {
    if (!ALLOWED_STUDENT_FIELDS.has(field))
      throw new ValidationError(`Field "${field}" is not allowed.`);
  }
};

export const normalizeAndValidateStudentPayload = (payload, { partial = false } = {}) => {
  validateAllowedFields(payload);

  const student = normalizeStudentPayload(payload);

  if (partial && Object.keys(student).length === 0)
    throw new ValidationError("At least one field is required for update.");

  validateStudentFields(student, { partial });

  return student;
};
