import { z } from "zod";
import { objectId } from "./common.schema.js";

export const assignTeacherSchema = z.object({
  teacherId: objectId,
  classroomId: objectId,
});
