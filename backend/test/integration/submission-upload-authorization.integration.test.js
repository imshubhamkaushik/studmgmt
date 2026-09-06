import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../../src/app.js";
import { User } from "../../src/models/user.model.js";
import { AcademicYear } from "../../src/models/academic-year.model.js";
import { Classroom } from "../../src/models/classroom.model.js";
import { Enrollment } from "../../src/models/enrollment.model.js";
import { Subject } from "../../src/models/subject.model.js";
import { Assignment } from "../../src/models/assignment.model.js";
import { createStudent } from "../../src/services/student.service.js";
import { studentDefaultPassword } from "../../src/utils/portal-credentials.js";
import { hashPassword } from "../../src/utils/password.js";

const uri = process.env.TEST_MONGODB_URI;
const secret = process.env.JWT_SECRET;
let server;
let baseUrl;

async function createUser({ name, email, password, role }) {
  const { hash, salt } = hashPassword(password);
  return User.create({ name, email, passwordHash: hash, passwordSalt: salt, role, isActive: true });
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

// createStudent() (not Student.create() directly) so provisionPortalAccounts()
// actually runs and the student gets real portal credentials, exactly as
// happens in production — the default password is studentId + DOB (YYYYMMDD).
async function createStudentWithPortalAccount(fields) {
  const student = await createStudent(fields);
  const password = studentDefaultPassword(student.studentId, fields.dob);
  return { student, password };
}

async function loginAndGetPortalToken(studentId, password) {
  const response = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: studentId, password }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Portal login failed: ${JSON.stringify(body)}`);
  return body.data.accessToken;
}

before(async () => {
  if (!uri) throw new Error("TEST_MONGODB_URI is required for integration tests.");
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be configured for integration tests.");
  await mongoose.connect(uri);
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await mongoose.disconnect();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

test("a student enrolled in the assignment's classroom can request an upload URL", async () => {
  const teacher = await createUser({ name: "Teacher", email: "sub-teacher@test.local", password: "StrongPassword123!", role: "teacher" });

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const room = await Classroom.create({ className: "8", section: "A", academicYear: year._id });
  const subject = await Subject.create({ name: "English" });

  const dob = "2013-01-01";
  const { student, password } = await createStudentWithPortalAccount({ name: "Enrolled Student", rollNo: 1, class: "8", section: "A", dob });
  await Enrollment.create({ student: student._id, academicYear: year._id, classroom: room._id, rollNo: 1, status: "active" });

  const assignment = await Assignment.create({
    classroom: room._id, subject: subject._id, teacher: teacher._id,
    title: "Essay", dueDate: new Date("2099-01-01"),
  });

  const portalToken = await loginAndGetPortalToken(student.studentId, password);

  const response = await request(`/api/v1/portal/assignment-submissions/assignment/${assignment._id}/upload-url`, {
    method: "POST",
    headers: { authorization: `Bearer ${portalToken}`, "content-type": "application/json" },
    body: JSON.stringify({ originalName: "essay.pdf", mimeType: "application/pdf" }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.data.uploadUrl);
  assert.ok(body.data.submissionId);
});

test("a student NOT enrolled in the assignment's classroom is rejected, not silently allowed", async () => {
  const teacher = await createUser({ name: "Teacher2", email: "sub-teacher2@test.local", password: "StrongPassword123!", role: "teacher" });

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const roomA = await Classroom.create({ className: "9", section: "A", academicYear: year._id });
  const roomB = await Classroom.create({ className: "9", section: "B", academicYear: year._id });
  const subject = await Subject.create({ name: "Math" });

  const dob = "2013-01-01";
  const { student: outsideStudent, password } = await createStudentWithPortalAccount({ name: "Outside Student", rollNo: 1, class: "9", section: "B", dob });
  // Enrolled in room B, not room A
  await Enrollment.create({ student: outsideStudent._id, academicYear: year._id, classroom: roomB._id, rollNo: 1, status: "active" });

  // Assignment belongs to room A
  const assignment = await Assignment.create({
    classroom: roomA._id, subject: subject._id, teacher: teacher._id,
    title: "Quiz", dueDate: new Date("2099-01-01"),
  });

  const portalToken = await loginAndGetPortalToken(outsideStudent.studentId, password);

  const response = await request(`/api/v1/portal/assignment-submissions/assignment/${assignment._id}/upload-url`, {
    method: "POST",
    headers: { authorization: `Bearer ${portalToken}`, "content-type": "application/json" },
    body: JSON.stringify({ originalName: "answers.pdf", mimeType: "application/pdf" }),
  });

  assert.equal(response.status, 403);
});

test("a student with no enrollment at all is rejected", async () => {
  const teacher = await createUser({ name: "Teacher3", email: "sub-teacher3@test.local", password: "StrongPassword123!", role: "teacher" });

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const room = await Classroom.create({ className: "10", section: "A", academicYear: year._id });
  const subject = await Subject.create({ name: "History" });

  const dob = "2012-01-01";
  const { student: unenrolledStudent, password } = await createStudentWithPortalAccount({ name: "Unenrolled Student", rollNo: 1, class: "10", section: "A", dob });
  // No Enrollment record created at all.

  const assignment = await Assignment.create({
    classroom: room._id, subject: subject._id, teacher: teacher._id,
    title: "Report", dueDate: new Date("2099-01-01"),
  });

  const portalToken = await loginAndGetPortalToken(unenrolledStudent.studentId, password);

  const response = await request(`/api/v1/portal/assignment-submissions/assignment/${assignment._id}/upload-url`, {
    method: "POST",
    headers: { authorization: `Bearer ${portalToken}`, "content-type": "application/json" },
    body: JSON.stringify({ originalName: "report.pdf", mimeType: "application/pdf" }),
  });

  assert.equal(response.status, 403);
});
