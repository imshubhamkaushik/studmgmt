import { Router } from "express";
import { authorize } from "../middleware/auth.middleware.js";
import { getRecent } from "../controllers/audit.controller.js";

const router = Router();

router.get("/recent", authorize("admin", "staff"), getRecent);

export default router;
