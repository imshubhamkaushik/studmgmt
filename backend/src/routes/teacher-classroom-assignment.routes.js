import { Router } from "express";
import * as c from "../controllers/teacher-classroom-assignment.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const r = Router();
r.get("/", authorize("admin", "staff"), c.list);
r.post("/", authorize("admin", "staff"), c.assign);
r.patch("/:id/revoke", authorize("admin", "staff"), validateObjectId(), c.revoke);

export default r;
