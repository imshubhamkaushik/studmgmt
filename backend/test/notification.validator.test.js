import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCreateNotification } from "../src/validators/notification.validator.js";

test("defaults to a school-wide announcement when no scope is given", () => {
  const result = normalizeCreateNotification({ title: "Half day tomorrow" });
  assert.equal(result.scope.level, "school");
  assert.equal(result.type, "announcement");
});

test("rejects a missing title", () => {
  assert.throws(() => normalizeCreateNotification({ title: "" }), /title is required/);
});

test("rejects a title over 150 characters", () => {
  assert.throws(() => normalizeCreateNotification({ title: "x".repeat(151) }), /title is required/);
});

test("requires scope.student when level is student", () => {
  assert.throws(
    () => normalizeCreateNotification({ title: "Grade posted", scope: { level: "student" } }),
    /scope.student must be a valid id/,
  );
});

test("accepts a valid student-scoped notification", () => {
  const id = "507f1f77bcf86cd799439011";
  const result = normalizeCreateNotification({
    title: "Grade posted",
    type: "grade_posted",
    scope: { level: "student", student: id },
  });
  assert.equal(result.scope.student, id);
  assert.equal(result.type, "grade_posted");
});

test("falls back to 'announcement' for an unrecognized type", () => {
  const result = normalizeCreateNotification({ title: "Test", type: "not_a_real_type" });
  assert.equal(result.type, "announcement");
});
