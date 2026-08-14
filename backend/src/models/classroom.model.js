import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true, maxlength: 50 },
  section: { type: String, required: true, trim: true, maxlength: 20 },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
  capacity: { type: Number, default: null, min: 1, max: 10000 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });
classroomSchema.index({ academicYear: 1, className: 1, section: 1 }, { unique: true });
export const Classroom = mongoose.model("Classroom", classroomSchema);
