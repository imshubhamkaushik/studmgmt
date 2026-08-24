import { Router } from "express";
import * as c from "../controllers/mark-entry.controller.js";
import { authorize } from "../middleware/auth.middleware.js";

const r = Router();

r.get("/exam/:examId/roster", authorize("admin", "staff", "teacher"), c.getRoster);
r.post("/exam/:examId/bulk", authorize("admin", "staff", "teacher"), c.bulkEnter);
r.get("/subject-grade", authorize("admin", "staff", "teacher"), c.subjectGrade);

export default r;
