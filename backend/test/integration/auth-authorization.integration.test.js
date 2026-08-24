import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../../src/app.js";
import { User } from "../../src/models/user.model.js";
import { Session } from "../../src/models/session.model.js";
import { Student } from "../../src/models/student.model.js";
import { AcademicYear } from "../../src/models/academic-year.model.js";
import { Classroom } from "../../src/models/classroom.model.js";
import { Enrollment } from "../../src/models/enrollment.model.js";
import { TeacherClassroomAssignment } from "../../src/models/teacher-classroom-assignment.model.js";
import { Attendance } from "../../src/models/attendance.model.js";
import { AuditLog } from "../../src/models/audit-log.model.js";
import { hashPassword } from "../../src/utils/password.js";

const uri = process.env.TEST_MONGODB_URI;
const secret = process.env.JWT_SECRET;
let server;
let baseUrl;

async function createUser({ name, email, password, role, isActive = true }) {
  const { hash, salt } = hashPassword(password);
  return User.create({ name, email, passwordHash: hash, passwordSalt: salt, role, isActive });
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function login(email, password) {
  const response = await request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { response, body: await response.json() };
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
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

test("role boundaries: admin can manage users while teacher cannot", async () => {
  await createUser({ name: "Admin", email: "admin@test.local", password: "StrongPassword123!", role: "admin" });
  await createUser({ name: "Teacher", email: "teacher@test.local", password: "StrongPassword123!", role: "teacher" });

  const admin = await login("admin@test.local", "StrongPassword123!");
  const teacher = await login("teacher@test.local", "StrongPassword123!");
  assert.equal(admin.response.status, 200);
  assert.equal(teacher.response.status, 200);

  const adminResponse = await request("/api/v1/auth/users", {
    headers: { authorization: `Bearer ${admin.body.data.accessToken}` },
  });
  assert.equal(adminResponse.status, 200);

  const teacherResponse = await request("/api/v1/auth/users", {
    headers: { authorization: `Bearer ${teacher.body.data.accessToken}` },
  });
  assert.equal(teacherResponse.status, 403);
});

test("deactivated users are rejected even when holding an otherwise valid access token", async () => {
  const user = await createUser({ name: "Staff", email: "staff@test.local", password: "StrongPassword123!", role: "staff" });
  const session = await login("staff@test.local", "StrongPassword123!");
  assert.equal(session.response.status, 200);

  await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
  const response = await request("/api/v1/dashboard", {
    headers: { authorization: `Bearer ${session.body.data.accessToken}` },
  });
  assert.equal(response.status, 401);
});

test("refresh token rotation revokes the previous session", async () => {
  await createUser({ name: "Admin", email: "rotate@test.local", password: "StrongPassword123!", role: "admin" });
  const loginResult = await login("rotate@test.local", "StrongPassword123!");
  assert.equal(loginResult.response.status, 200);

  const firstCookie = loginResult.response.headers.get("set-cookie");
  assert.ok(firstCookie?.includes("refresh_token="));

  const refresh = await request("/api/v1/auth/refresh", {
    method: "POST",
    headers: { cookie: firstCookie.split(";")[0] },
  });
  assert.equal(refresh.status, 200);
  const rotatedCookie = refresh.headers.get("set-cookie");
  assert.ok(rotatedCookie?.includes("refresh_token="));

  const reuseOld = await request("/api/v1/auth/refresh", {
    method: "POST",
    headers: { cookie: firstCookie.split(";")[0] },
  });
  assert.equal(reuseOld.status, 401);

  const activeSessions = await Session.countDocuments({ revokedAt: null });
  assert.equal(activeSessions, 1);
});


async function createClassroomFixture({ teacherEmail = "teacher.fixture@test.local", assigned = true } = {}) {
  const teacher = await createUser({ name: "Teacher Fixture", email: teacherEmail, password: "StrongPassword123!", role: "teacher" });
  const year = await AcademicYear.create({ name: "2026-2027", startDate: new Date("2026-04-01"), endDate: new Date("2027-03-31"), isActive: true });
  const classroom = await Classroom.create({ className: "10", section: "A", academicYear: year._id, capacity: 40, isActive: true });
  const student = await Student.create({ studentId: "STU-TEST-001", name: "Assigned Student", rollNo: 1, class: "10", section: "A", status: "active", dob: new Date("2010-01-01") });
  await Enrollment.create({ student: student._id, academicYear: year._id, classroom: classroom._id, rollNo: 1, status: "active" });
  await Attendance.create({ student: student._id, date: new Date("2026-08-01"), status: "present" });
  if (assigned) await TeacherClassroomAssignment.create({ teacher: teacher._id, classroom: classroom._id, isActive: true });
  return { teacher, classroom, student };
}

test("teacher attendance access is allowed only for an assigned classroom", async () => {
  const { teacher } = await createClassroomFixture({ assigned: true });
  const loginResult = await login(teacher.email, "StrongPassword123!");
  const token = loginResult.body.data.accessToken;
  const allowed = await request("/api/v1/attendance?class=10&section=A", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(allowed.status, 200);
  const denied = await request("/api/v1/attendance?class=10&section=B", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(denied.status, 403);
});

test("unassigned teacher cannot access a student attendance history", async () => {
  const { teacher, student } = await createClassroomFixture({ assigned: false });
  const loginResult = await login(teacher.email, "StrongPassword123!");
  const response = await request(`/api/v1/attendance/student/${student._id}`, { headers: { authorization: `Bearer ${loginResult.body.data.accessToken}` } });
  assert.equal(response.status, 403);
});

test("attendance audit records persist the authenticated actor", async () => {
  const admin = await createUser({ name: "Audit Admin", email: "audit-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const year = await AcademicYear.create({ name: "2027-2028", startDate: new Date("2027-04-01"), endDate: new Date("2028-03-31"), isActive: true });
  const student = await Student.create({ studentId: "STU-AUDIT-001", name: "Audit Student", rollNo: 1, class: "9", section: "A", status: "active", dob: new Date("2011-01-01") });
  const loginResult = await login(admin.email, "StrongPassword123!");
  const response = await request("/api/v1/attendance/bulk", {
    method: "POST",
    headers: { authorization: `Bearer ${loginResult.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ className: "9", section: "A", date: "2027-08-01", records: [{ studentId: String(student._id), status: "present" }] }),
  });
  assert.equal(response.status, 200);
  const audit = await AuditLog.findOne({ entityType: "attendance", action: "BULK_MARK" }).lean();
  assert.ok(audit);
  assert.equal(String(audit.actor), String(admin._id));
  assert.equal(audit.actorEmail, admin.email);
});

test("account is locked after five consecutive failed login attempts", async () => {
  await createUser({ name: "Lockout Target", email: "lockout@test.local", password: "StrongPassword123!", role: "staff" });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { response } = await login("lockout@test.local", "WrongPassword123!");
    assert.equal(response.status, 401);
  }

  const lockedOutWithCorrectPassword = await login("lockout@test.local", "StrongPassword123!");
  assert.equal(lockedOutWithCorrectPassword.response.status, 423);

  const user = await User.findOne({ email: "lockout@test.local" });
  assert.ok(user.lockedUntil > new Date());
  assert.equal(user.failedLoginAttempts, 0);
});

test("a successful login resets any prior failed attempt count", async () => {
  await createUser({ name: "Recovers", email: "recovers@test.local", password: "StrongPassword123!", role: "staff" });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { response } = await login("recovers@test.local", "WrongPassword123!");
    assert.equal(response.status, 401);
  }

  const success = await login("recovers@test.local", "StrongPassword123!");
  assert.equal(success.response.status, 200);

  const user = await User.findOne({ email: "recovers@test.local" });
  assert.equal(user.failedLoginAttempts, 0);
  assert.equal(user.lockedUntil, null);
});

test("an admin can unlock a locked account without resetting the password", async () => {
  const admin = await createUser({ name: "Unlock Admin", email: "unlock-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const target = await createUser({ name: "Locked User", email: "locked-user@test.local", password: "StrongPassword123!", role: "staff" });
  await User.updateOne({ _id: target._id }, { $set: { lockedUntil: new Date(Date.now() + 15 * 60000), failedLoginAttempts: 0 } });

  const stillLocked = await login("locked-user@test.local", "StrongPassword123!");
  assert.equal(stillLocked.response.status, 423);

  const adminLogin = await login("unlock-admin@test.local", "StrongPassword123!");
  const unlockResponse = await request(`/api/v1/auth/users/${target._id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${adminLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ unlock: true }),
  });
  assert.equal(unlockResponse.status, 200);

  const nowUnlocked = await login("locked-user@test.local", "StrongPassword123!");
  assert.equal(nowUnlocked.response.status, 200);
});

test("a teacher without staff privileges cannot create a student", async () => {
  const teacher = await createUser({ name: "Plain Teacher", email: "plain-teacher@test.local", password: "StrongPassword123!", role: "teacher" });
  const teacherLogin = await login("plain-teacher@test.local", "StrongPassword123!");

  const response = await request("/api/v1/students", {
    method: "POST",
    headers: { authorization: `Bearer ${teacherLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "New Student", class: "5", section: "A", rollNo: 1, dob: "2015-01-01" }),
  });
  assert.equal(response.status, 403);
  void teacher;
});

test("granting staff privileges lets a teacher create a student; revoking removes it again", async () => {
  const admin = await createUser({ name: "Grant Admin", email: "grant-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const teacher = await createUser({ name: "Upgraded Teacher", email: "upgraded-teacher@test.local", password: "StrongPassword123!", role: "teacher" });

  const adminLogin = await login("grant-admin@test.local", "StrongPassword123!");
  const grantResponse = await request(`/api/v1/auth/users/${teacher._id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${adminLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ hasStaffPrivileges: true }),
  });
  assert.equal(grantResponse.status, 200);
  assert.equal(grantResponse.headers.get("content-type")?.includes("json"), true);

  const teacherLogin = await login("upgraded-teacher@test.local", "StrongPassword123!");
  const createResponse = await request("/api/v1/students", {
    method: "POST",
    headers: { authorization: `Bearer ${teacherLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "New Student", class: "5", section: "A", rollNo: 1, dob: "2015-01-01" }),
  });
  assert.equal(createResponse.status, 201);

  const revokeResponse = await request(`/api/v1/auth/users/${teacher._id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${adminLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ hasStaffPrivileges: false }),
  });
  assert.equal(revokeResponse.status, 200);

  const secondTeacherLogin = await login("upgraded-teacher@test.local", "StrongPassword123!");
  const secondCreateResponse = await request("/api/v1/students", {
    method: "POST",
    headers: { authorization: `Bearer ${secondTeacherLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Another Student", class: "5", section: "B", rollNo: 2, dob: "2015-01-01" }),
  });
  assert.equal(secondCreateResponse.status, 403);
});

test("staff privileges are rejected for non-teacher accounts", async () => {
  const admin = await createUser({ name: "Reject Admin", email: "reject-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const staffUser = await createUser({ name: "Regular Staff", email: "regular-staff@test.local", password: "StrongPassword123!", role: "staff" });

  const adminLogin = await login("reject-admin@test.local", "StrongPassword123!");
  const response = await request(`/api/v1/auth/users/${staffUser._id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${adminLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ hasStaffPrivileges: true }),
  });
  assert.equal(response.status, 400);
});

test("a teacher can only promote students into a classroom they are assigned to", async () => {
  const admin = await createUser({ name: "Promotion Admin", email: "promotion-admin@test.local", password: "StrongPassword123!", role: "admin" });
  const teacher = await createUser({ name: "Class Teacher", email: "class-teacher@test.local", password: "StrongPassword123!", role: "teacher" });

  const fromYear = await AcademicYear.create({ name: "2025-26", startDate: new Date("2025-06-01"), endDate: new Date("2026-04-30"), isActive: false });
  const toYear = await AcademicYear.create({ name: "2026-27", startDate: new Date("2026-06-01"), endDate: new Date("2027-04-30"), isActive: true });
  const sourceRoom = await Classroom.create({ className: "5", section: "A", academicYear: fromYear._id });
  const destRoom = await Classroom.create({ className: "6", section: "A", academicYear: toYear._id });

  const student = await Student.create({ name: "Batch Student", class: "5", section: "A", rollNo: 1, dob: new Date("2015-01-01"), status: "active" });
  await Enrollment.create({ student: student._id, academicYear: fromYear._id, classroom: sourceRoom._id, rollNo: 1, status: "active" });

  // Teacher is assigned to the source classroom but NOT yet the destination.
  await TeacherClassroomAssignment.create({ teacher: teacher._id, classroom: sourceRoom._id, isActive: true });

  const teacherLogin = await login("class-teacher@test.local", "StrongPassword123!");
  const blockedResponse = await request("/api/v1/enrollments/promote", {
    method: "POST",
    headers: { authorization: `Bearer ${teacherLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      studentIds: [student._id.toString()],
      fromAcademicYearId: fromYear._id.toString(),
      toAcademicYearId: toYear._id.toString(),
      toClassroomId: destRoom._id.toString(),
    }),
  });
  assert.equal(blockedResponse.status, 403);

  // Once also assigned to the destination classroom (continuing as class
  // teacher for the promoted batch), the same promotion succeeds.
  await TeacherClassroomAssignment.create({ teacher: teacher._id, classroom: destRoom._id, isActive: true });

  const secondTeacherLogin = await login("class-teacher@test.local", "StrongPassword123!");
  const allowedResponse = await request("/api/v1/enrollments/promote", {
    method: "POST",
    headers: { authorization: `Bearer ${secondTeacherLogin.body.data.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      studentIds: [student._id.toString()],
      fromAcademicYearId: fromYear._id.toString(),
      toAcademicYearId: toYear._id.toString(),
      toClassroomId: destRoom._id.toString(),
    }),
  });
  assert.equal(allowedResponse.status, 201);
  void admin;
});
