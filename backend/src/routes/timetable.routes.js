import { Router } from "express";
import * as c from "../controllers/timetable.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const r = Router();

r.get("/", authorize("admin", "staff", "teacher"), c.list);
r.post("/", authorize("admin", "staff"), c.create);
r.delete("/:id", authorize("admin", "staff"), validateObjectId(), c.remove);

export default r;
