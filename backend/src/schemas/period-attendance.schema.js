import { z } from "zod";
import { objectId } from "./common.schema.js";
import { ATTENDANCE_STATUSES } from "../utils/attendance-statuses.js";

const entrySchema = z.object({
  studentId: objectId,
  status: z.enum(ATTENDANCE_STATUSES, {
    errorMap: () => ({ message: `must be one of: ${ATTENDANCE_STATUSES.join(", ")}.` }),
  }),
});

export const bulkMarkPeriodAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must use YYYY-MM-DD format."),
  entries: z.array(entrySchema).min(1, "At least one entry is required.").max(500),
});
