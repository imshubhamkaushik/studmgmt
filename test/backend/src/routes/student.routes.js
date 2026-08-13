import { Router } from "express";

import * as studentController from "../controllers/student.controller.js";

import {
  validateCreateStudent,
  validateUpdateStudent,
} from "../validators/student.validator.js";

import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const router = Router();

router
  .route("/")
  .get(studentController.getStudents)
  .post(validateCreateStudent, studentController.createStudent);

router
  .route("/:id")
  .get(validateObjectId(), studentController.getStudentById)
  .patch(
    validateObjectId(),
    validateUpdateStudent,
    studentController.updateStudent,
  )
  .delete(validateObjectId(), studentController.deleteStudent);

export default router;
