import { Router } from "express";
import * as c from "../controllers/classroom.controller.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createClassroomSchema,
  updateClassroomSchema,
  generateDefaultClassroomsSchema,
} from "../schemas/classroom.schema.js";

const r = Router();

r.get("/", c.list);
r.post("/", authorize("admin"), validate({ body: createClassroomSchema }), c.create);
r.post(
  "/generate-defaults",
  authorize("admin"),
  validate({ body: generateDefaultClassroomsSchema }),
  c.generateDefaults,
);
r.patch("/:id", authorize("admin"), validateObjectId(), validate({ body: updateClassroomSchema }), c.update);

export default r;
