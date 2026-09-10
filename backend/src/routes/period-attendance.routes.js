import { Router } from "express";
import * as c from "../controllers/period-attendance.controller.js";
import { authorize } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validate-object-id.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { bulkMarkPeriodAttendanceSchema } from "../schemas/period-attendance.schema.js";

const router = Router();

router.get(
  "/:timetableEntryId/roster",
  authorize("admin", "staff", "teacher"),
  validateObjectId("timetableEntryId"),
  c.getRoster,
);
router.post(
  "/:timetableEntryId/mark",
  authorize("admin", "staff", "teacher"),
  validateObjectId("timetableEntryId"),
  validate({ body: bulkMarkPeriodAttendanceSchema }),
  c.bulkMark,
);

export default router;
