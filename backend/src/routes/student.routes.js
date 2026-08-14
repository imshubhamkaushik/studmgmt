import { Router } from "express";
import * as studentController from "../controllers/student.controller.js";
import { validateCreateStudent, validateUpdateStudent } from "../validators/student.validator.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const router = Router();

router.get("/filter-options", studentController.getStudentFilterOptions);
router.get("/export", studentController.exportStudents);
router.post("/import", studentController.importStudents);

router.route("/")
  .get(studentController.getStudents)
  .post(validateCreateStudent, studentController.createStudent);

router.patch("/bulk", studentController.bulkUpdateStudents);

router.route("/:id")
  .get(validateObjectId(), studentController.getStudentById)
  .patch(validateObjectId(), validateUpdateStudent, studentController.updateStudent)
  .delete(validateObjectId(), studentController.deleteStudent);

router.post("/:id/restore", validateObjectId(), studentController.restoreStudent);
router.get("/:id/audit", validateObjectId(), studentController.getStudentAuditHistory);

export default router;
