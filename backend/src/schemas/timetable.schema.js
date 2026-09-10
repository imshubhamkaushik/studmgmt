import { z } from "zod";
import { objectId, optionalObjectId } from "./common.schema.js";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const createTimetableEntrySchema = z.object({
  classroom: objectId,
  subject: objectId,
  teacher: optionalObjectId.nullable(),
  dayOfWeek: z.enum(DAYS, { errorMap: () => ({ message: `must be one of: ${DAYS.join(", ")}.` }) }),
  startTime: z.string().regex(TIME_RE, "startTime must be in HH:MM 24-hour format."),
  endTime: z.string().regex(TIME_RE, "endTime must be in HH:MM 24-hour format."),
  room: z.string().trim().max(40).optional(),
});
