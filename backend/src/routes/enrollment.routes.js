import { Router } from "express";
import * as c from "../controllers/enrollment.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createEnrollmentSchema, promoteStudentsSchema } from "../schemas/enrollment.schema.js";

const r = Router();

r.get("/", c.list);
r.post("/", authorize("admin", "staff"), validate({ body: createEnrollmentSchema }), c.create);
r.post("/promote", authorize("admin", "teacher"), validate({ body: promoteStudentsSchema }), c.promote);

export default r;
