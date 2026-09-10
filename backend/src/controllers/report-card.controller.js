import * as service from "../services/report-card.service.js";
import { Student } from "../models/student.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

function sendPdf(res, buffer, filename) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
}

export const getReportCard = asyncHandler(async (req, res) => {
  const { studentId, academicYearId } = req.query;
  if (!studentId || !academicYearId)
    throw new AppError("studentId and academicYearId are required.", 400);
  const { buffer } = await service.generateReportCardPdf(studentId, academicYearId);
  sendPdf(res, buffer, `report-card-${studentId}.pdf`);
});

export const generateForClassroom = asyncHandler(async (req, res) => {
  const { classroomId, academicYearId } = req.body;
  if (!classroomId || !academicYearId)
    throw new AppError("classroomId and academicYearId are required.", 400);
  const results = await service.generateReportCardsForClassroom(classroomId, academicYearId);
  res.status(200).json({
    success: true,
    message: `Generated ${results.length} report card(s) and notified students.`,
    data: results,
  });
});

export const downloadGenerated = asyncHandler(async (req, res) => {
  const buffer = service.readGeneratedReportCard(req.params.studentId, req.params.academicYearId);
  sendPdf(res, buffer, `report-card-${req.params.studentId}.pdf`);
});

export const downloadClassroomZip = asyncHandler(async (req, res) => {
  const { classroomId, academicYearId } = req.params;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="report-cards-${classroomId}.zip"`);
  // streamClassroomReportCardsZip pipes directly into res as each PDF is
  // ready, rather than buffering the whole archive in memory first — a
  // full classroom's worth of report cards is small in absolute terms,
  // but there's no reason to hold it all in one Buffer when a stream
  // does the same job.
  await service.streamClassroomReportCardsZip(classroomId, academicYearId, res);
});

// Portal-facing — a student or their guardian fetching the student's own
// report card. req.portalUser.studentId is the human-readable student
// code shared by both actor types, so it's resolved to a Mongo _id here.
export const getMyReportCard = asyncHandler(async (req, res) => {
  const { academicYearId } = req.query;
  if (!academicYearId) throw new AppError("academicYearId is required.", 400);
  const student = await Student.findOne({ studentId: req.portalUser.studentId }).select("_id").lean();
  if (!student) throw new AppError("Student record not found.", 404);
  const { buffer } = await service.generateReportCardPdf(student._id, academicYearId);
  sendPdf(res, buffer, "report-card.pdf");
});
