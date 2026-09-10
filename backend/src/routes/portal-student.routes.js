import { Router } from "express";
import * as c from "../controllers/portal-student.controller.js";

const router = Router();

router.get("/profile", c.getMyProfile);
router.get("/attendance", c.getMyAttendance);
router.get("/assignments", c.getMyAssignments);

export default router;
