import { Router } from "express";
import * as c from "../controllers/exam.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createExamSchema, updateExamSchema } from "../schemas/exam.schema.js";

const r = Router();

r.get("/", authorize("admin", "staff", "teacher"), c.list);
r.post("/", authorize("admin", "staff"), validate({ body: createExamSchema }), c.create);
r.patch("/:id", authorize("admin", "staff"), validateObjectId(), validate({ body: updateExamSchema }), c.update);

export default r;
