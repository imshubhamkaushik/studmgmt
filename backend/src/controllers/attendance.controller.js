import * as attendanceService from "../services/attendance.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const markBulkAttendance = asyncHandler(async (req, res) => { const data = await attendanceService.markBulkAttendance(req.body, req.requestId); res.status(200).json({ success: true, message: "Attendance saved successfully.", data }); });
export const getAttendance = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await attendanceService.getAttendance(req.query) }));
export const getAttendanceSummary = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await attendanceService.getAttendanceSummary(req.query) }));
export const getStudentAttendanceHistory = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await attendanceService.getStudentAttendanceHistory(req.params.studentId, req.query) }));
