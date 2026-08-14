import { Router } from "express";
import * as c from "../controllers/enrollment.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
const r=Router();
r.get("/",c.list);
r.post("/",authorize("admin","staff"),c.create);
r.post("/promote",authorize("admin"),c.promote);
export default r;
