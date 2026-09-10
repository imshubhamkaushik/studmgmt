import { Router } from "express";
import * as c from "../controllers/subject.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createSubjectSchema, updateSubjectSchema } from "../schemas/subject.schema.js";

const r = Router();

r.get("/", c.list);
r.post("/", authorize("admin", "staff"), validate({ body: createSubjectSchema }), c.create);
r.patch("/:id", authorize("admin", "staff"), validateObjectId(), validate({ body: updateSubjectSchema }), c.update);

export default r;
