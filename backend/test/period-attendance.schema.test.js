import test from "node:test";
import assert from "node:assert/strict";
import { bulkMarkPeriodAttendanceSchema } from "../src/schemas/period-attendance.schema.js";

const validId = "507f1f77bcf86cd799439011";

test("accepts a valid bulk mark payload", () => {
  const result = bulkMarkPeriodAttendanceSchema.safeParse({
    date: "2026-09-07",
    entries: [{ studentId: validId, status: "present" }],
  });
  assert.equal(result.success, true);
});

test("rejects a malformed date", () => {
  const result = bulkMarkPeriodAttendanceSchema.safeParse({
    date: "09-07-2026",
    entries: [{ studentId: validId, status: "present" }],
  });
  assert.equal(result.success, false);
});

test("rejects an invalid attendance status", () => {
  const result = bulkMarkPeriodAttendanceSchema.safeParse({
    date: "2026-09-07",
    entries: [{ studentId: validId, status: "on-vacation" }],
  });
  assert.equal(result.success, false);
});

test("rejects an empty entries array", () => {
  const result = bulkMarkPeriodAttendanceSchema.safeParse({ date: "2026-09-07", entries: [] });
  assert.equal(result.success, false);
});

test("rejects a non-ObjectId studentId", () => {
  const result = bulkMarkPeriodAttendanceSchema.safeParse({
    date: "2026-09-07",
    entries: [{ studentId: "not-an-id", status: "present" }],
  });
  assert.equal(result.success, false);
});
