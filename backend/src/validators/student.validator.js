// The row-validation rules live in shared/student-validation.mjs — see
// that file for why. This file just adapts them into Express middleware.
import { normalizeAndValidateStudentPayload } from "../../../shared/student-validation.mjs";

export { normalizeAndValidateStudentPayload };

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
