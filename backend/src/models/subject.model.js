import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    code: { type: String, trim: true, uppercase: true, maxlength: 15 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

subjectSchema.index({ name: 1 }, { unique: true });

export const Subject = mongoose.model("Subject", subjectSchema);
