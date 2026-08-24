import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../../src/app.js";
import { User } from "../../src/models/user.model.js";
import { Student } from "../../src/models/student.model.js";
import { AcademicYear } from "../../src/models/academic-year.model.js";
import { Classroom } from "../../src/models/classroom.model.js";
import { Enrollment } from "../../src/models/enrollment.model.js";
import { Subject } from "../../src/models/subject.model.js";
import { GradingTerm } from "../../src/models/grading-term.model.js";
import { Exam } from "../../src/models/exam.model.js";
import { MarkEntry } from "../../src/models/mark-entry.model.js";
import { AuditLog } from "../../src/models/audit-log.model.js";
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

async function loginAndGetToken(email, password) {
  const response = await request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
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
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await mongoose.disconnect();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

test("a weighted grade correctly combines two grading terms by their weight", async () => {
  const admin = await createUser({ name: "Grade Admin", email: "grade-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const adminToken = await loginAndGetToken("grade-admin@test.local", "StrongPassword123!");

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const room = await Classroom.create({ className: "8", section: "A", academicYear: year._id });
  const student = await Student.create({ name: "Grade Student", class: "8", section: "A", rollNo: 1, dob: new Date("2013-01-01"), status: "active" });
  await Enrollment.create({ student: student._id, academicYear: year._id, classroom: room._id, rollNo: 1, status: "active" });

  const subjectResponse = await request("/api/v1/subjects", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Mathematics" }),
  });
  assert.equal(subjectResponse.status, 201);
  const subject = (await subjectResponse.json()).data;

  // Unit Test worth 30%, Final Exam worth 70%.
  const unitTestTermResponse = await request("/api/v1/grading-terms", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ academicYear: year._id.toString(), name: "Unit Test 1", weightPercent: 30 }),
  });
  assert.equal(unitTestTermResponse.status, 201);
  const unitTestTerm = (await unitTestTermResponse.json()).data;

  const finalTermResponse = await request("/api/v1/grading-terms", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ academicYear: year._id.toString(), name: "Final Exam", weightPercent: 70 }),
  });
  assert.equal(finalTermResponse.status, 201);
  const finalTerm = (await finalTermResponse.json()).data;

  // A third term that would push the total over 100% must be rejected.
  const overBudgetResponse = await request("/api/v1/grading-terms", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ academicYear: year._id.toString(), name: "Extra Term", weightPercent: 5 }),
  });
  assert.equal(overBudgetResponse.status, 400);

  const unitExamResponse = await request("/api/v1/exams", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      classroom: room._id.toString(),
      subject: subject._id,
      gradingTerm: unitTestTerm._id,
      academicYear: year._id.toString(),
      name: "Math Unit Test 1",
      examDate: "2026-08-01",
      maxMarks: 50,
    }),
  });
  assert.equal(unitExamResponse.status, 201);
  const unitExam = (await unitExamResponse.json()).data;

  const finalExamResponse = await request("/api/v1/exams", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      classroom: room._id.toString(),
      subject: subject._id,
      gradingTerm: finalTerm._id,
      academicYear: year._id.toString(),
      name: "Math Final Exam",
      examDate: "2026-12-01",
      maxMarks: 100,
    }),
  });
  assert.equal(finalExamResponse.status, 201);
  const finalExam = (await finalExamResponse.json()).data;

  // Student scores 80% on the unit test (40/50) and 60% on the final (60/100).
  const unitMarkResponse = await request(`/api/v1/marks/exam/${unitExam._id}/bulk`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ entries: [{ studentId: student._id.toString(), marksObtained: 40 }] }),
  });
  assert.equal(unitMarkResponse.status, 200);

  const finalMarkResponse = await request(`/api/v1/marks/exam/${finalExam._id}/bulk`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ entries: [{ studentId: student._id.toString(), marksObtained: 60 }] }),
  });
  assert.equal(finalMarkResponse.status, 200);

  // Rejects an out-of-range mark instead of silently accepting it.
  const invalidMarkResponse = await request(`/api/v1/marks/exam/${finalExam._id}/bulk`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ entries: [{ studentId: student._id.toString(), marksObtained: 150 }] }),
  });
  assert.equal(invalidMarkResponse.status, 400);

  const gradeResponse = await request(
    `/api/v1/marks/subject-grade?studentId=${student._id}&subjectId=${subject._id}&academicYearId=${year._id}`,
    { headers: { authorization: `Bearer ${adminToken}` } },
  );
  assert.equal(gradeResponse.status, 200);
  const grade = (await gradeResponse.json()).data;

  // Expected: (80 * 30 + 60 * 70) / 100 = 66
  assert.equal(grade.percent, 66);
  assert.equal(grade.breakdown.length, 2);
  assert.equal(grade.breakdown.every((b) => b.status === "graded"), true);

  const auditEntries = await AuditLog.find({ entityType: "markEntry" }).lean();
  assert.equal(auditEntries.length, 2);
});

test("a teacher cannot enter marks for an exam outside their assigned classroom", async () => {
  const admin = await createUser({ name: "Scope Admin", email: "scope-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const teacher = await createUser({ name: "Other Teacher", email: "other-teacher@test.local", password: "StrongPassword123!", role: "teacher" });
  const adminToken = await loginAndGetToken("scope-admin@test.local", "StrongPassword123!");

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const room = await Classroom.create({ className: "9", section: "A", academicYear: year._id });
  const student = await Student.create({ name: "Scoped Student", class: "9", section: "A", rollNo: 1, dob: new Date("2012-01-01"), status: "active" });
  await Enrollment.create({ student: student._id, academicYear: year._id, classroom: room._id, rollNo: 1, status: "active" });

  const subject = await Subject.create({ name: "Science" });
  const term = await GradingTerm.create({ academicYear: year._id, name: "Unit Test", weightPercent: 100 });
  const exam = await Exam.create({
    academicYear: year._id, classroom: room._id, subject: subject._id, gradingTerm: term._id,
    name: "Science Unit Test", examDate: new Date("2026-09-01"), maxMarks: 50,
  });

  const teacherToken = await loginAndGetToken("other-teacher@test.local", "StrongPassword123!");
  const response = await request(`/api/v1/marks/exam/${exam._id}/bulk`, {
    method: "POST",
    headers: { authorization: `Bearer ${teacherToken}`, "content-type": "application/json" },
    body: JSON.stringify({ entries: [{ studentId: student._id.toString(), marksObtained: 30 }] }),
  });
  assert.equal(response.status, 403);

  const marks = await MarkEntry.find({ exam: exam._id }).lean();
  assert.equal(marks.length, 0);
  void admin;
});
