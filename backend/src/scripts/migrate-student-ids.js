import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { Student } from "../models/student.model.js";
import { Counter } from "../models/counter.model.js";

dotenv.config();
const dryRun = process.argv.includes("--dry-run");
const COUNTER_NAME = "studentIdSequence";
const STUDENT_ID_PATTERN = /^STU-(\d+)$/;
const formatStudentId = (sequence) => `STU-${String(sequence).padStart(6, "0")}`;

const inspect = async () => {
  const students = await Student.find().select("studentId class section rollNo createdAt").lean();
  const ids = new Map(); let highest = 0; let malformed = 0; let missing = 0;
  for (const student of students) {
    if (!student.studentId) { missing += 1; continue; }
    const match = typeof student.studentId === "string" && student.studentId.match(STUDENT_ID_PATTERN);
    if (!match) { malformed += 1; continue; }
    highest = Math.max(highest, Number(match[1]));
    ids.set(student.studentId, (ids.get(student.studentId) || 0) + 1);
  }
  return { highest, malformed, missing, duplicateIds: [...ids.values()].filter((count) => count > 1).length };
};

const migrateStudentIds = async () => {
  try {
    await connectDatabase();
    const report = await inspect();
    console.log("Migration inspection:", report);
    if (dryRun) { console.log("Dry run complete. No data was changed."); return; }
    if (report.malformed || report.duplicateIds) throw new Error("Fix malformed or duplicate Student IDs before migration.");
    const counter = await Counter.findById(COUNTER_NAME);
    let sequence = Math.max(counter?.sequenceValue ?? 0, report.highest);
    const studentsWithoutId = await Student.find({ $or: [{ studentId: { $exists: false } }, { studentId: null }, { studentId: "" }] }).sort({ createdAt: 1, _id: 1 });
    for (const student of studentsWithoutId) { sequence += 1; student.studentId = formatStudentId(sequence); await student.save(); }
    await Counter.findByIdAndUpdate(COUNTER_NAME, { $set: { sequenceValue: sequence } }, { upsert: true });
    console.log(`Student ID migration completed. Current sequence: ${sequence}.`);
  } catch (error) { console.error("Student ID migration failed:", error); process.exitCode = 1; }
  finally { await mongoose.connection.close(); }
};
migrateStudentIds();
