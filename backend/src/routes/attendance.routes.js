import { Router } from "express";
import * as controller from "../controllers/attendance.controller.js";
import { validateBulkAttendance } from "../validators/attendance.validator.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { authorize } from "../middleware/auth.middleware.js";
import { enforceTeacherClassroom } from "../middleware/teacher-classroom.middleware.js";
import { enforceTeacherStudentAccess } from "../middleware/teacher-student-access.middleware.js";

const router = Router();

router.get("/", enforceTeacherClassroom, controller.getAttendance);

router.get(
  "/summary",
  enforceTeacherClassroom,
  controller.getAttendanceSummary,
);

router.get(
  "/student/:studentId",
  validateObjectId("studentId"),
  enforceTeacherStudentAccess,
  controller.getStudentAttendanceHistory,
);

router.post(
  "/bulk",
  authorize("admin", "staff", "teacher"),
  enforceTeacherClassroom,
  validateBulkAttendance,
  controller.markBulkAttendance,
);

export default router;
