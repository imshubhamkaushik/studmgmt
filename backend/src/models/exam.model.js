import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    gradingTerm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GradingTerm",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    examDate: { type: Date, required: true },
    maxMarks: { type: Number, required: true, min: 1 },
    passMarks: { type: Number, default: null, min: 0 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

examSchema.index({ classroom: 1, subject: 1, gradingTerm: 1 }, { unique: true });
examSchema.index({ examDate: 1 });

examSchema.pre("validate", function (next) {
  if (this.passMarks != null && this.maxMarks != null && this.passMarks > this.maxMarks)
    this.invalidate("passMarks", "Pass marks cannot exceed max marks.");
  next();
});

export const Exam = mongoose.model("Exam", examSchema);
