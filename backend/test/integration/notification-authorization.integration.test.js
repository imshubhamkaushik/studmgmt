import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../../src/app.js";
import { User } from "../../src/models/user.model.js";
import { Student } from "../../src/models/student.model.js";
import { AcademicYear } from "../../src/models/academic-year.model.js";
import { Classroom } from "../../src/models/classroom.model.js";
import { Enrollment } from "../../src/models/enrollment.model.js";
import { TeacherClassroomAssignment } from "../../src/models/teacher-classroom-assignment.model.js";
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

test("a teacher cannot send a school-wide announcement", async () => {
  await createUser({ name: "Notify Teacher", email: "notify-teacher@test.local", password: "StrongPassword123!", role: "teacher" });
  const teacherToken = await loginAndGetToken("notify-teacher@test.local", "StrongPassword123!");

  const response = await request("/api/v1/notifications", {
    method: "POST",
    headers: { authorization: `Bearer ${teacherToken}`, "content-type": "application/json" },
    body: JSON.stringify({ title: "No classes tomorrow" }),
  });
  assert.equal(response.status, 403);
});

test("a teacher can announce to their own classroom but not someone else's", async () => {
  const teacher = await createUser({ name: "Own Teacher", email: "own-teacher@test.local", password: "StrongPassword123!", role: "teacher" });
  const teacherToken = await loginAndGetToken("own-teacher@test.local", "StrongPassword123!");

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const ownRoom = await Classroom.create({ className: "6", section: "A", academicYear: year._id });
  const otherRoom = await Classroom.create({ className: "6", section: "B", academicYear: year._id });
  await TeacherClassroomAssignment.create({ teacher: teacher._id, classroom: ownRoom._id, isActive: true });

  const allowed = await request("/api/v1/notifications", {
    method: "POST",
    headers: { authorization: `Bearer ${teacherToken}`, "content-type": "application/json" },
    body: JSON.stringify({ title: "Bring your textbooks", scope: { level: "classroom", classroom: ownRoom._id.toString() } }),
  });
  assert.equal(allowed.status, 201);

  const denied = await request("/api/v1/notifications", {
    method: "POST",
    headers: { authorization: `Bearer ${teacherToken}`, "content-type": "application/json" },
    body: JSON.stringify({ title: "Bring your textbooks", scope: { level: "classroom", classroom: otherRoom._id.toString() } }),
  });
  assert.equal(denied.status, 403);
});

test("a teacher cannot notify a student outside their assigned classrooms", async () => {
  await createUser({ name: "Scoped Notify Teacher", email: "scoped-notify@test.local", password: "StrongPassword123!", role: "teacher" });
  const teacherToken = await loginAndGetToken("scoped-notify@test.local", "StrongPassword123!");

  const year = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const otherRoom = await Classroom.create({ className: "6", section: "C", academicYear: year._id });
  const outsideStudent = await Student.create({ name: "Outside Student", class: "6", section: "C", rollNo: 1, dob: new Date("2015-01-01"), status: "active" });
  await Enrollment.create({ student: outsideStudent._id, academicYear: year._id, classroom: otherRoom._id, rollNo: 1, status: "active" });

  const response = await request("/api/v1/notifications", {
    method: "POST",
    headers: { authorization: `Bearer ${teacherToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      title: "Reminder",
      scope: { level: "student", student: outsideStudent._id.toString() },
    }),
  });
  assert.equal(response.status, 403);
});
