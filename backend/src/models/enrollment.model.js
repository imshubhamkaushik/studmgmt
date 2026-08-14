import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
  rollNo: { type: Number, required: true, min: 1 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  status: { type: String, enum: ["active", "completed", "transferred", "withdrawn"], default: "active", index: true },
}, { timestamps: true, versionKey: false });

enrollmentSchema.index({ student: 1, academicYear: 1 }, { unique: true });
enrollmentSchema.index({ classroom: 1, rollNo: 1, status: 1 });
enrollmentSchema.index({ academicYear: 1, classroom: 1, status: 1 });

export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
