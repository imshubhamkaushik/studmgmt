import { Router } from "express";
import * as c from "../controllers/report-card.controller.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/student", authorize("admin", "staff", "teacher"), c.getReportCard);
router.post("/classroom/generate", authorize("admin", "staff"), c.generateForClassroom);
router.get(
  "/classroom/download/:studentId/:academicYearId",
  authorize("admin", "staff", "teacher"),
  c.downloadGenerated,
);

export default router;
