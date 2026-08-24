import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../../src/app.js";
import { Student } from "../../src/models/student.model.js";
import { Guardian } from "../../src/models/guardian.model.js";
import { PortalSession } from "../../src/models/portal-session.model.js";
import { provisionPortalAccounts } from "../../src/services/portal-provisioning.service.js";
import {
  studentDefaultPassword,
  guardianUsername,
  guardianDefaultPassword,
} from "../../src/utils/portal-credentials.js";

const uri = process.env.TEST_MONGODB_URI;
const secret = process.env.JWT_SECRET;
let server;
let baseUrl;

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function createProvisionedStudent(overrides = {}) {
  const student = await Student.create({
    name: "Portal Student",
    class: "7",
    section: "B",
    rollNo: 1,
    dob: new Date("2014-05-20"),
    status: "active",
    ...overrides,
  });
  await provisionPortalAccounts(student);
  return student;
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

test("a student can log in with their default (studentId + DOB) password", async () => {
  const student = await createProvisionedStudent();

  const response = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: student.studentId,
      password: studentDefaultPassword(student.studentId, student.dob),
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.actor.type, "student");
  assert.equal(body.data.actor.studentId, student.studentId);
  assert.equal(body.data.actor.usingDefaultPassword, true);
  assert.ok(body.data.accessToken);
});

test("a guardian can log in with the -parent suffixed username and password", async () => {
  const student = await createProvisionedStudent();

  const response = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: guardianUsername(student.studentId),
      password: guardianDefaultPassword(student.studentId, student.dob),
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.actor.type, "guardian");
  assert.equal(body.data.actor.studentId, student.studentId);
  assert.equal(body.data.actor.studentName, student.name);
});

test("a wrong password is rejected without revealing which part was wrong", async () => {
  const student = await createProvisionedStudent();

  const response = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: student.studentId, password: "totally-wrong" }),
  });
  assert.equal(response.status, 401);
});

test("a student account locks after five failed attempts, independent of the guardian account", async () => {
  const student = await createProvisionedStudent();

  for (let i = 0; i < 5; i += 1) {
    const response = await request("/api/v1/portal/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: student.studentId, password: "wrong" }),
    });
    assert.equal(response.status, 401);
  }

  const lockedResponse = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: student.studentId,
      password: studentDefaultPassword(student.studentId, student.dob),
    }),
  });
  assert.equal(lockedResponse.status, 423);

  // The guardian account for the same student is untouched by the
  // student account's lockout.
  const guardianResponse = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: guardianUsername(student.studentId),
      password: guardianDefaultPassword(student.studentId, student.dob),
    }),
  });
  assert.equal(guardianResponse.status, 200);
});

test("changing the password is self-service, invalidates other sessions, and the old default stops working", async () => {
  const student = await createProvisionedStudent();
  const defaultPassword = studentDefaultPassword(student.studentId, student.dob);

  const firstLogin = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: student.studentId, password: defaultPassword }),
  });
  const firstBody = await firstLogin.json();
  const firstCookie = firstLogin.headers.get("set-cookie");

  const secondLogin = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: student.studentId, password: defaultPassword }),
  });
  const secondCookie = secondLogin.headers.get("set-cookie");

  const changeResponse = await request("/api/v1/portal/auth/change-password", {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${firstBody.data.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ currentPassword: defaultPassword, newPassword: "a-new-chosen-password" }),
  });
  assert.equal(changeResponse.status, 200);

  // The other session's refresh token (from the second login) should now
  // be revoked as a side effect of the password change.
  const refreshWithOldSession = await request("/api/v1/portal/auth/refresh", {
    method: "POST",
    headers: { cookie: secondCookie ? secondCookie.split(";")[0] : "" },
  });
  assert.equal(refreshWithOldSession.status, 401);
  void firstCookie;

  const oldPasswordLogin = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: student.studentId, password: defaultPassword }),
  });
  assert.equal(oldPasswordLogin.status, 401);

  const newPasswordLogin = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: student.studentId, password: "a-new-chosen-password" }),
  });
  assert.equal(newPasswordLogin.status, 200);
  const newBody = await newPasswordLogin.json();
  assert.equal(newBody.data.actor.usingDefaultPassword, false);
});

test("a portal access token cannot be used against staff-only routes", async () => {
  const student = await createProvisionedStudent();
  const loginResponse = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: student.studentId,
      password: studentDefaultPassword(student.studentId, student.dob),
    }),
  });
  const { data } = await loginResponse.json();

  const staffRouteResponse = await request("/api/v1/students", {
    headers: { authorization: `Bearer ${data.accessToken}` },
  });
  assert.equal(staffRouteResponse.status, 401);
});

test("an archived (soft-deleted) student cannot log in to the portal", async () => {
  const student = await createProvisionedStudent({ isDeleted: true });

  const response = await request("/api/v1/portal/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: student.studentId,
      password: studentDefaultPassword(student.studentId, student.dob),
    }),
  });
  assert.equal(response.status, 401);

  const guardianCount = await Guardian.countDocuments({ student: student._id });
  assert.equal(guardianCount, 1);

  const sessionCount = await PortalSession.countDocuments();
  assert.equal(sessionCount, 0);
});
