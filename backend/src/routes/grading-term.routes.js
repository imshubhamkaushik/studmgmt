import { Router } from "express";
import * as c from "../controllers/grading-term.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createGradingTermSchema, updateGradingTermSchema } from "../schemas/grading-term.schema.js";

const r = Router();

r.get("/", c.list);
r.post("/", authorize("admin", "staff"), validate({ body: createGradingTermSchema }), c.create);
r.patch("/:id", authorize("admin", "staff"), validateObjectId(), validate({ body: updateGradingTermSchema }), c.update);

export default r;
