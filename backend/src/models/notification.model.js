import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "announcement",
  "grade_posted",
  "attendance_flagged",
  "report_card_ready",
  "submission_received",
  "system",
];

export const NOTIFICATION_LEVELS = ["school", "classroom", "student", "teacher"];

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, trim: true, maxlength: 1000, default: "" },

    // Scope determines who can see this notification. Exactly one of
    // classroom/student is set alongside level, or neither for level
    // "school" (visible to everyone).
    scope: {
      level: { type: String, enum: NOTIFICATION_LEVELS, required: true },
      classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", default: null },
      student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
      // Only set when level is "teacher" — targets one specific staff
      // User (e.g. the teacher who owns an assignment), as opposed to
      // "school" level which every staff member already sees regardless.
      recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },

    // Staff-only — announcements/system notifications are created by a
    // User (admin/staff/teacher). Automated notifications (grade_posted,
    // report_card_ready) leave this null.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Read receipts as composite keys ("user:<id>" / "student:<id>" /
    // "guardian:<id>") rather than a ref array, since a single
    // notification can be read by actors from three different
    // collections (User, Student, Guardian). A dedicated read-receipt
    // collection would be more normalized but is unnecessary at this
    // notification volume.
    readBy: [{ type: String }],
  },
  { timestamps: true, versionKey: false },
);

notificationSchema.index({ "scope.level": 1, createdAt: -1 });
notificationSchema.index({ "scope.student": 1, createdAt: -1 });
notificationSchema.index({ "scope.classroom": 1, createdAt: -1 });

notificationSchema.pre("validate", function (next) {
  if (this.scope?.level === "classroom" && !this.scope.classroom)
    this.invalidate("scope.classroom", "scope.classroom is required when level is 'classroom'.");
  if (this.scope?.level === "student" && !this.scope.student)
    this.invalidate("scope.student", "scope.student is required when level is 'student'.");
  if (this.scope?.level === "teacher" && !this.scope.recipientUser)
    this.invalidate("scope.recipientUser", "scope.recipientUser is required when level is 'teacher'.");
  next();
});

export const Notification = mongoose.model("Notification", notificationSchema);
