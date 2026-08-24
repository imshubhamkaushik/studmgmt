import { Router } from "express";
import * as c from "../controllers/assignment.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const r = Router();

r.get("/", authorize("admin", "staff", "teacher"), c.list);
r.post(
  "/",
  authorize("admin", "staff", "teacher"),
  uploadSingle("assignments", "attachment"),
  c.create,
);
r.patch("/:id", authorize("admin", "staff", "teacher"), validateObjectId(), c.update);
r.get(
  "/:id/attachment",
  authorize("admin", "staff", "teacher"),
  validateObjectId(),
  c.downloadAttachment,
);

export default r;
