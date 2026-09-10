import { Router } from "express";
import * as c from "../controllers/teacher-classroom-assignment.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { assignTeacherSchema } from "../schemas/teacher-classroom-assignment.schema.js";

const r = Router();
r.get("/", authorize("admin", "staff", "teacher"), c.list);
r.post("/", authorize("admin", "staff"), validate({ body: assignTeacherSchema }), c.assign);
r.patch("/:id/revoke", authorize("admin", "staff"), validateObjectId(), c.revoke);

export default r;
