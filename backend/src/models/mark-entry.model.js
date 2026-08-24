import mongoose from "mongoose";

const markEntrySchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    marksObtained: { type: Number, default: null, min: 0 },
    isAbsent: { type: Boolean, default: false },
    remarks: { type: String, trim: true, maxlength: 300, default: "" },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

markEntrySchema.index({ exam: 1, student: 1 }, { unique: true });

markEntrySchema.pre("validate", function (next) {
  if (!this.isAbsent && (this.marksObtained === null || this.marksObtained === undefined))
    this.invalidate("marksObtained", "marksObtained is required unless the student was absent.");
  next();
});

export const MarkEntry = mongoose.model("MarkEntry", markEntrySchema);
