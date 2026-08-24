import { Router } from "express";
import * as c from "../controllers/grading-term.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const r = Router();

r.get("/", c.list);
r.post("/", authorize("admin", "staff"), c.create);
r.patch("/:id", authorize("admin", "staff"), validateObjectId(), c.update);

export default r;
