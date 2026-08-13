import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, "Student ID is required."],
      immutable: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters."],
      maxlength: [100, "Name cannot exceed 100 characters."],
    },

    rollNo: {
      type: Number,
      required: [true, "Roll number is required."],
      min: [1, "Roll number must be greater than 0."],
    },

    class: {
      type: String,
      required: [true, "Class is required."],
      trim: true,
      minlength: [1, "Class cannot be empty."],
      maxlength: [50, "Class cannot exceed 50 characters."],
    },

    dob: {
      type: Date,
      required: [true, "Date of birth is required."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

studentSchema.index({ studentId: 1 }, { unique: true });

export const Student = mongoose.model("Student", studentSchema);
