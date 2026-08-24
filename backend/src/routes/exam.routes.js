import { Router } from "express";
import * as c from "../controllers/exam.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const r = Router();

r.get("/", authorize("admin", "staff", "teacher"), c.list);
r.post("/", authorize("admin", "staff"), c.create);
r.patch("/:id", authorize("admin", "staff"), validateObjectId(), c.update);

export default r;
