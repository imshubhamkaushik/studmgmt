import { z } from "zod";
import { objectId } from "./common.schema.js";

export const reportCardQuerySchema = z.object({
  studentId: objectId,
  academicYearId: objectId,
});

export const generateClassroomReportCardsSchema = z.object({
  classroomId: objectId,
  academicYearId: objectId,
});
