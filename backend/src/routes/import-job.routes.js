import { Router } from "express";
import * as c from "../controllers/import-job.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { uploadCsvMemory } from "../middleware/upload.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";

const router = Router();

// Same roles as the regular synchronous CSV import.
router.post("/", authorize("admin", "staff"), uploadCsvMemory("file"), c.startJob);

// Anyone who could have started an import can check on one — the
// creator-or-admin check happens inside the service, per job, since
// "staff" here means "any staff member can see any staff member's job"
// would be too broad; the actual rule is narrower than the role check.
router.get("/:jobId", authorize("admin", "staff", "teacher"), validateObjectId("jobId"), c.getJobStatus);
router.get(
  "/:jobId/error-report",
  authorize("admin", "staff", "teacher"),
  validateObjectId("jobId"),
  c.downloadErrorReport,
);

export default router;
