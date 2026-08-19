import { Router } from "express";
import * as c from "../controllers/classroom.controller.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { authorize } from "../middleware/auth.middleware.js";

const r = Router();

r.get("/", c.list);
r.post("/", authorize("admin"), c.create);
r.post("/generate-defaults", authorize("admin"), c.generateDefaults);
r.patch("/:id", authorize("admin"), validateObjectId(), c.update);

export default r;
