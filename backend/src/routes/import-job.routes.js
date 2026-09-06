import { Router } from "express";
import * as c from "../controllers/import-job.controller.js";
import { authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Anyone who could have started an import can check on one — the
// creator-or-admin check happens inside the service, per job, since
// "staff" here means "any staff member can see any staff member's job"
// would be too broad; the actual rule is narrower than the role check.
router.get("/:jobId", authorize("admin", "staff", "teacher"), c.getJobStatus);

export default router;
