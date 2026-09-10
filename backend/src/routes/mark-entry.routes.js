import { Router } from "express";
import * as c from "../controllers/mark-entry.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { bulkEnterMarksSchema, subjectGradeQuerySchema } from "../schemas/mark-entry.schema.js";

const r = Router();

r.get("/exam/:examId/roster", authorize("admin", "staff", "teacher"), c.getRoster);
r.post(
  "/exam/:examId/bulk",
  authorize("admin", "staff", "teacher"),
  validate({ body: bulkEnterMarksSchema }),
  c.bulkEnter,
);
r.get(
  "/subject-grade",
  authorize("admin", "staff", "teacher"),
  validate({ query: subjectGradeQuerySchema }),
  c.subjectGrade,
);

export default r;
