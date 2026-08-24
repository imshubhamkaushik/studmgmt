import mongoose from "mongoose";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const timetableEntrySchema = new mongoose.Schema(
  {
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
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dayOfWeek: { type: String, enum: DAYS, required: true },
    // Stored as "HH:MM" 24-hour strings rather than Date objects — a
    // timetable slot is a recurring weekly time-of-day, not a specific
    // calendar date, so a plain sortable string is simpler and avoids
    // timezone ambiguity entirely.
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    room: { type: String, trim: true, maxlength: 40, default: "" },
  },
  { timestamps: true, versionKey: false },
);

timetableEntrySchema.index({ classroom: 1, dayOfWeek: 1, startTime: 1 });

timetableEntrySchema.pre("validate", function (next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime)
    this.invalidate("endTime", "End time must be after start time.");
  next();
});

export const TimetableEntry = mongoose.model("TimetableEntry", timetableEntrySchema);
export const TIMETABLE_DAYS = DAYS;
