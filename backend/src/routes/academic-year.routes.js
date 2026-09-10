import { Router } from "express";
import * as c from "../controllers/academic-year.controller.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createAcademicYearSchema, updateAcademicYearSchema } from "../schemas/academic-year.schema.js";

const r = Router();

r.get("/", c.list);
r.post("/", authorize("admin"), validate({ body: createAcademicYearSchema }), c.create);
r.patch("/:id", authorize("admin"), validateObjectId(), validate({ body: updateAcademicYearSchema }), c.update);
r.post("/:id/activate", authorize("admin"), validateObjectId(), c.setActive);

export default r;
