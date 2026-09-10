import { Router } from "express";
import { authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { auditLogQuerySchema } from "../schemas/audit.schema.js";
import { getRecent, list, getFilterOptions } from "../controllers/audit.controller.js";

const router = Router();

router.get("/recent", authorize("admin", "staff"), getRecent);
// Full audit log, filters, and pagination — kept admin-only rather than
// admin+staff like /recent above. /recent only ever surfaces a handful of
// the very latest events for a dashboard widget; this endpoint exposes
// the complete history of who-did-what across every user in the system,
// which is a materially more sensitive surface than a glanceable feed.
router.get("/", authorize("admin"), validate({ query: auditLogQuerySchema }), list);
router.get("/filter-options", authorize("admin"), getFilterOptions);

export default router;
