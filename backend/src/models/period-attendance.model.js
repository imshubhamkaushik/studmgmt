import mongoose from "mongoose";
import { ATTENDANCE_STATUSES } from "../utils/attendance-statuses.js";

// Deliberately a separate collection from Attendance (the existing
// once-a-day record), not a migration of it. The daily model is keyed off
// the Student's denormalized class/section strings and is used by the
// dashboard's "Today's Attendance" stat and by report cards — changing
// its shape would ripple through both. Period attendance is additive: a
// classroom that has a timetable can *also* track per-period attendance
// (e.g. present for period 1, absent for period 3) without touching the
// daily figure at all. Nothing currently reads this model into the daily
// summary; the two are independent by design, not by oversight.
const periodAttendanceSchema = new mongoose.Schema(
  {
    timetableEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimetableEntry",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    // Stored even though timetableEntry already implies a day-of-week —
    // the entry defines the *recurring* Monday-1st-period slot, this
    // record is about one specific calendar date's occurrence of it.
    date: { type: Date, required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

// One mark per student, per period, per calendar date.
periodAttendanceSchema.index({ timetableEntry: 1, student: 1, date: 1 }, { unique: true });
periodAttendanceSchema.index({ student: 1, date: 1 });

export const PeriodAttendance = mongoose.model("PeriodAttendance", periodAttendanceSchema);
