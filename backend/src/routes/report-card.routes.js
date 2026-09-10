import { Router } from "express";
import * as c from "../controllers/report-card.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { reportCardQuerySchema, generateClassroomReportCardsSchema } from "../schemas/report-card.schema.js";

const router = Router();

router.get(
  "/student",
  authorize("admin", "staff", "teacher"),
  validate({ query: reportCardQuerySchema }),
  c.getReportCard,
);
router.post(
  "/classroom/generate",
  authorize("admin", "staff"),
  validate({ body: generateClassroomReportCardsSchema }),
  c.generateForClassroom,
);
router.get(
  "/classroom/download/:studentId/:academicYearId",
  authorize("admin", "staff", "teacher"),
  c.downloadGenerated,
);
router.get(
  "/classroom/download-zip/:classroomId/:academicYearId",
  authorize("admin", "staff", "teacher"),
  c.downloadClassroomZip,
);

export default router;
