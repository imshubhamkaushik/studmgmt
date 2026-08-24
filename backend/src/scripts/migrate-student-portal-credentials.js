import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { Student } from "../models/student.model.js";
import { Guardian } from "../models/guardian.model.js";
import { provisionPortalAccounts } from "../services/portal-provisioning.service.js";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");

try {
  await connectDatabase();

  const missingCredentials = await Student.find({
    isDeleted: { $ne: true },
    passwordHash: null,
  }).select("+passwordHash");

  console.log(`Students missing portal credentials: ${missingCredentials.length}`);

  if (dryRun) {
    console.log("Dry run complete. No data was changed.");
  } else {
    let created = 0;
    for (const student of missingCredentials) {
      await provisionPortalAccounts(student);
      created += 1;
    }
    console.log(`Provisioned portal credentials for ${created} student(s) and their guardian accounts.`);
  }

  const guardianCount = await Guardian.countDocuments();
  console.log(`Total guardian accounts now: ${guardianCount}`);
} catch (error) {
  console.error("Portal credential migration failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.connection.close();
}
