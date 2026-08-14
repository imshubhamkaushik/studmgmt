import { Router } from "express";
import * as studentController from "../controllers/student.controller.js";
import {
  validateCreateStudent,
  validateUpdateStudent,
} from "../validators/student.validator.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/filter-options", studentController.getStudentFilterOptions);
router.get("/check-availability", studentController.checkStudentAvailability);
router.get("/export", studentController.exportStudents);
router.post(
  "/import",
  authorize("admin", "staff"),
  studentController.importStudents,
);

router
  .route("/")
  .get(studentController.getStudents)
  .post(
    authorize("admin", "staff"),
    validateCreateStudent,
    studentController.createStudent,
  );

router.patch(
  "/bulk",
  authorize("admin", "staff"),
  studentController.bulkUpdateStudents,
);

router
  .route("/:id")
  .get(validateObjectId(), studentController.getStudentById)
  .patch(
    authorize("admin", "staff"),
    validateObjectId(),
    validateUpdateStudent,
    studentController.updateStudent,
  )
  .delete(
    authorize("admin"),
    validateObjectId(),
    studentController.deleteStudent,
  );

router.post(
  "/:id/restore",
  authorize("admin"),
  validateObjectId(),
  studentController.restoreStudent,
);
router.get(
  "/:id/audit",
  validateObjectId(),
  studentController.getStudentAuditHistory,
);

export default router;
