import { Router } from "express";
import * as c from "../controllers/assignment-submission.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const r = Router();

r.get(
  "/assignment/:assignmentId",
  authorize("admin", "staff", "teacher"),
  c.list,
);
r.post(
  "/assignment/:assignmentId",
  authorize("admin", "staff", "teacher"),
  uploadSingle("submissions", "file"),
  c.submit,
);
r.post(
  "/assignment/:assignmentId/upload-url",
  authorize("admin", "staff", "teacher"),
  c.getUploadUrl,
);
r.patch("/:id/grade", authorize("admin", "staff", "teacher"), validateObjectId(), c.grade);
r.get("/:id/file", authorize("admin", "staff", "teacher"), validateObjectId(), c.downloadFile);

export default r;
