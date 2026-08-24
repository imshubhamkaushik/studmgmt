import mongoose from "mongoose";

const gradingTermSchema = new mongoose.Schema(
  {
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // How much this term counts toward the final subject grade. All active
    // (non-archived) terms for one academic year should sum to 100 — this
    // is enforced at the service layer rather than the schema layer, since
    // it's a cross-document invariant Mongoose can't check on its own.
    weightPercent: { type: Number, required: true, min: 0, max: 100 },
    order: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

gradingTermSchema.index({ academicYear: 1, name: 1 }, { unique: true });

export const GradingTerm = mongoose.model("GradingTerm", gradingTermSchema);
