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
import { Notification } from "../../src/models/notification.model.js";
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
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await mongoose.disconnect();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

test("report cards auto-generate only once every subject is graded, not after the first exam", async () => {
  await createUser({ name: "RC Admin", email: "rc-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const adminToken = await loginAndGetToken("rc-admin@test.local", "StrongPassword123!");

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const room = await Classroom.create({ className: "7", section: "A", academicYear: year._id });

  const studentA = await Student.create({ name: "Student A", class: "7", section: "A", rollNo: 1, dob: new Date("2014-01-01"), status: "active" });
  const studentB = await Student.create({ name: "Student B", class: "7", section: "A", rollNo: 2, dob: new Date("2014-02-01"), status: "active" });
  await Enrollment.create({ student: studentA._id, academicYear: year._id, classroom: room._id, rollNo: 1, status: "active" });
  await Enrollment.create({ student: studentB._id, academicYear: year._id, classroom: room._id, rollNo: 2, status: "active" });

  const math = await Subject.create({ name: "Mathematics" });
  const science = await Subject.create({ name: "Science" });
  const term = await GradingTerm.create({ academicYear: year._id, name: "Unit Test 1", weightPercent: 100 });

  const mathExam = await Exam.create({
    academicYear: year._id, classroom: room._id, subject: math._id, gradingTerm: term._id,
    name: "Math Unit Test 1", examDate: new Date("2026-08-01"), maxMarks: 50,
  });
  const scienceExam = await Exam.create({
    academicYear: year._id, classroom: room._id, subject: science._id, gradingTerm: term._id,
    name: "Science Unit Test 1", examDate: new Date("2026-08-02"), maxMarks: 50,
  });

  const enterMarks = (examId, entries) =>
    request(`/api/v1/marks/exam/${examId}/bulk`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({ entries }),
    });

  // Only Math is graded so far — the term isn't complete yet, so no
  // report card should be generated or sent.
  const mathResponse = await enterMarks(mathExam._id, [
    { studentId: studentA._id.toString(), marksObtained: 40 },
    { studentId: studentB._id.toString(), marksObtained: 35 },
  ]);
  assert.equal(mathResponse.status, 200);

  let reportCardNotifications = await Notification.find({ type: "report_card_ready" }).lean();
  assert.equal(reportCardNotifications.length, 0, "no report card should exist until every subject is graded");

  const pendingDownload = await request(
    `/api/v1/report-cards/classroom/download/${studentA._id}/${year._id}`,
    { headers: { authorization: `Bearer ${adminToken}` } },
  );
  assert.equal(pendingDownload.status, 404);

  // Grading Science completes the term for this classroom — this should
  // now trigger auto-generation for both students.
  const scienceResponse = await enterMarks(scienceExam._id, [
    { studentId: studentA._id.toString(), marksObtained: 45 },
    { studentId: studentB._id.toString(), marksObtained: 30 },
  ]);
  assert.equal(scienceResponse.status, 200);

  reportCardNotifications = await Notification.find({ type: "report_card_ready" }).sort({ "scope.student": 1 }).lean();
  assert.equal(reportCardNotifications.length, 2, "one report_card_ready notification per student");

  const downloadA = await request(
    `/api/v1/report-cards/classroom/download/${studentA._id}/${year._id}`,
    { headers: { authorization: `Bearer ${adminToken}` } },
  );
  assert.equal(downloadA.status, 200);
  assert.equal(downloadA.headers.get("content-type"), "application/pdf");
});
