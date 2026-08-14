import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { Student } from "../models/student.model.js";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");

const missingStatusFilter = {
  $or: [{ status: { $exists: false } }, { status: null }, { status: "" }],
};

try {
  await connectDatabase();

  const missingStatus = await Student.countDocuments(missingStatusFilter);

  console.log(`Students missing status: ${missingStatus}`);

  if (dryRun) {
    console.log("Dry run complete. No data was changed.");
  } else if (missingStatus) {
    const result = await Student.updateMany(missingStatusFilter, {
      $set: { status: "active" },
    });

    console.log(`Updated ${result.modifiedCount} student(s) to active.`);
  }
} catch (error) {
  console.error("Student status migration failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.connection.close();
}
