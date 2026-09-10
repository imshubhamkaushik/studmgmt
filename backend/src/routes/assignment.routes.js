import { Router } from "express";
import * as c from "../controllers/assignment.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { uploadMemory } from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createAssignmentSchema, updateAssignmentSchema } from "../schemas/assignment.schema.js";

const r = Router();

r.get("/", authorize("admin", "staff", "teacher"), c.list);
r.post(
  "/",
  authorize("admin", "staff", "teacher"),
  uploadMemory("attachment"),
  validate({ body: createAssignmentSchema }),
  c.create,
);
r.patch(
  "/:id",
  authorize("admin", "staff", "teacher"),
  validateObjectId(),
  validate({ body: updateAssignmentSchema }),
  c.update,
);
r.get(
  "/:id/attachment",
  authorize("admin", "staff", "teacher"),
  validateObjectId(),
  c.downloadAttachment,
);

export default r;
