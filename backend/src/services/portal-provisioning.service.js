import { Guardian } from "../models/guardian.model.js";
import { hashPassword } from "../utils/password.js";
import {
  studentDefaultPassword,
  guardianDefaultPassword,
} from "../utils/portal-credentials.js";

// Sets the student's default portal password (their studentId + DOB) and
// creates their linked Guardian account with its own default password
// (same, plus a "-parent"-flavored suffix — see portal-credentials.js).
// Idempotent: safe to call on a student that already has a Guardian
// record, since it only creates one if missing.
export async function provisionPortalAccounts(student) {
  const defaultPassword = studentDefaultPassword(student.studentId, student.dob);
  const { hash, salt } = hashPassword(defaultPassword);
  student.passwordHash = hash;
  student.passwordSalt = salt;
  student.passwordChangedAt = null;
  await student.save();

  const existingGuardian = await Guardian.findOne({ student: student._id });
  if (existingGuardian) return existingGuardian;

  const guardianPassword = guardianDefaultPassword(student.studentId, student.dob);
  const guardianHash = hashPassword(guardianPassword);
  return Guardian.create({
    student: student._id,
    passwordHash: guardianHash.hash,
    passwordSalt: guardianHash.salt,
    passwordChangedAt: null,
  });
}
