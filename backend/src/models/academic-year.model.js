import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 30 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: false, index: true },
  isArchived: { type: Boolean, default: false, index: true },
}, { timestamps: true, versionKey: false });
academicYearSchema.index({ name: 1 }, { unique: true });
academicYearSchema.pre("validate", function(next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) this.invalidate("endDate", "End date must be after start date.");
  next();
});
export const AcademicYear = mongoose.model("AcademicYear", academicYearSchema);
