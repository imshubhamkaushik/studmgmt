import * as service from "../services/mark-entry.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const getRoster = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.getExamRoster(req.params.examId, req.user) }),
);

export const bulkEnter = asyncHandler(async (req, res) =>
  res.status(200).json({
    success: true,
    data: await service.bulkUpsertMarks(req.params.examId, req.body.entries, req.user, req.requestId),
  }),
);

export const subjectGrade = asyncHandler(async (req, res) => {
  const { studentId, subjectId, academicYearId } = req.query;
  if (!studentId || !subjectId || !academicYearId)
    throw new AppError("studentId, subjectId, and academicYearId are required.", 400);
  res.json({
    success: true,
    data: await service.computeSubjectGrade(studentId, subjectId, academicYearId),
  });
});
