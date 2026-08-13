import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDatabase } from "../config/db.js";
import { Student } from "../models/student.model.js";
import { Counter } from "../models/counter.model.js";

dotenv.config();

const COUNTER_NAME = "studentIdSequence";
const STUDENT_ID_PATTERN = /^STU-(\d+)$/;

const formatStudentId = (sequence) => {
  return `STU-${String(sequence).padStart(6, "0")}`;
};

const getHighestExistingSequence = async () => {
  const students = await Student.find({
    studentId: {
      $type: "string",
    },
  })
    .select("studentId")
    .lean();

  return students.reduce((highest, student) => {
    const match = student.studentId.match(STUDENT_ID_PATTERN);

    if (!match) {
      return highest;
    }

    return Math.max(highest, Number(match[1]));
  }, 0);
};

const migrateStudentIds = async () => {
  try {
    await connectDatabase();

    const highestExistingSequence = await getHighestExistingSequence();

    const counter = await Counter.findById(COUNTER_NAME);

    let sequence = Math.max(
      counter?.sequenceValue ?? 0,
      highestExistingSequence,
    );

    const studentsWithoutId = await Student.find({
      $or: [
        { studentId: { $exists: false } },
        { studentId: null },
        { studentId: "" },
      ],
    }).sort({
      createdAt: 1,
      _id: 1,
    });

    console.log(
      `Found ${studentsWithoutId.length} student(s) without Student ID.`,
    );

    for (const student of studentsWithoutId) {
      sequence += 1;

      student.studentId = formatStudentId(sequence);
      await student.save();
    }

    await Counter.findByIdAndUpdate(
      COUNTER_NAME,
      {
        $set: {
          sequenceValue: sequence,
        },
      },
      {
        upsert: true,
      },
    );

    console.log(
      `Student ID migration completed. Current sequence: ${sequence}.`,
    );
  } catch (error) {
    console.error("Student ID migration failed:", error);

    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

migrateStudentIds();
