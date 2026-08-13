import { AppError } from "../utils/AppError.js";

const isValidDate = (value) => {
  const date = new Date(value);

  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(date.getTime())
  );
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

  if (payload.dob !== undefined) {
    normalized.dob = payload.dob;
  }

  return normalized;
};

const validateStudentFields = (student, { partial = false } = {}) => {
  const fields = ["name", "rollNo", "class", "dob"];

  if (!partial) {
    for (const field of fields) {
      if (student[field] === undefined || student[field] === null) {
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

  if (student.dob !== undefined) {
    if (!isValidDate(student.dob)) {
      throw new AppError("Date of birth must be a valid date.", 400);
    }

    if (new Date(student.dob) > new Date()) {
      throw new AppError("Date of birth cannot be in the future.", 400);
    }
  }
};

export const validateCreateStudent = (req, res, next) => {
  validateAllowedFields(req.body);

  const student = normalizeStudentPayload(req.body);

  validateStudentFields(student);

  req.body = student;

  next();
};

export const validateUpdateStudent = (req, res, next) => {
  validateAllowedFields(req.body);

  const student = normalizeStudentPayload(req.body);

  if (Object.keys(student).length === 0) {
    return next(
      new AppError("At least one field is required for update.", 400),
    );
  }

  validateStudentFields(student, {
    partial: true,
  });

  req.body = student;

  next();
};

const ALLOWED_STUDENT_FIELDS = new Set(["name", "rollNo", "class", "dob"]);

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