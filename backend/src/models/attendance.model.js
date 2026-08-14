import mongoose from "mongoose";
import { ATTENDANCE_STATUSES } from "../utils/attendance-statuses.js";

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    
    date: { type: Date, required: true },
    
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
