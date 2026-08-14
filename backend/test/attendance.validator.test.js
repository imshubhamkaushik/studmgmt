import test from "node:test";
import assert from "node:assert/strict";
import { parseAttendanceDate, normalizeBulkAttendance } from "../src/validators/attendance.validator.js";

test("accepts strict attendance date and normalizes to UTC day", () => {
  const date = parseAttendanceDate("2026-08-14");
  assert.equal(date.toISOString(), "2026-08-14T00:00:00.000Z");
});

test("rejects invalid attendance date", () => {
  assert.throws(() => parseAttendanceDate("14/08/2026"), { statusCode: 400 });
});

test("rejects duplicate student IDs in bulk attendance", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.throws(() => normalizeBulkAttendance({ date: "2026-08-14", class: "10", section: "A", records: [{ studentId: id, status: "present" }, { studentId: id, status: "absent" }] }), { statusCode: 400 });
});
