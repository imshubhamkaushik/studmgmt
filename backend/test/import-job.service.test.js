import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/utils/csv.js";
import { parseStudentCsv, validateStudentRows, processImportJob } from "../src/services/import-job.service.js";

test("parseCsv handles quotes, escaped quotes, BOM and CRLF", () => {
  const rows = parseCsv('\uFEFFName,Class\r\n"Rao, Amelia",10\r\n"Say ""hi""",9\r\n\r\n');
  assert.deepEqual(rows, [
    ["Name", "Class"],
    ["Rao, Amelia", "10"],
    ['Say "hi"', "9"],
  ]);
});

test("parseStudentCsv maps headers (including 'Date of Birth') and numbers rows from 2", () => {
  const rows = parseStudentCsv("Name,Class,Section,Roll No,Date of Birth\nAmelia Rao,10,A,12,2012-05-01\n");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rowNumber, 2);
  assert.deepEqual(rows[0].raw, {
    name: "Amelia Rao",
    class: "10",
    section: "A",
    rollNo: "12",
    dob: "2012-05-01",
    status: "active",
  });
});

test("parseStudentCsv rejects files missing required columns or data rows", () => {
  assert.throws(() => parseStudentCsv("Name,Class\nA,1\n"), (e) => e.statusCode === 400);
  assert.throws(() => parseStudentCsv("Name,Class,Section,RollNo,DOB\n"), (e) => e.statusCode === 400);
});

test("validateStudentRows separates valid rows, invalid rows and in-file duplicates", () => {
  const rows = parseStudentCsv(
    [
      "Name,Class,Section,RollNo,DOB",
      "Amelia Rao,10,A,1,2012-05-01",
      "B,10,A,2,2012-05-01", // name too short
      "Carl Doe,10,A,1,2012-06-01", // duplicate class/section/roll of row 2
      "Dina Roe,10,A,x,2012-06-01", // bad roll number
      "Evan Poe,10,B,1,2012-02-31", // impossible date
    ].join("\n"),
  );
  const { valid, errors } = validateStudentRows(rows);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].student.name, "Amelia Rao");
  assert.deepEqual(errors.map((e) => e.rowNumber), [3, 4, 5, 6]);
  assert.ok(errors.every((e) => e.stage === "validation" && e.message));
});

test("processImportJob counts successes, records per-row failures and completes", async () => {
  const updates = [];
  const Model = { updateOne: async (filter, update) => updates.push(update) };
  const rows = [
    { rowNumber: 2, raw: { name: "A One", class: "1", section: "A", rollNo: "1", dob: "2012-01-01" }, student: { name: "A One" } },
    { rowNumber: 3, raw: { name: "B Two", class: "1", section: "A", rollNo: "2", dob: "2012-01-01" }, student: { name: "B Two" } },
  ];
  const createStudentFn = async (student) => {
    if (student.name === "B Two") throw new Error("Roll number already exists");
  };

  await processImportJob("job-1", rows, null, { createStudentFn, Model });

  assert.equal(updates.length, 3);
  assert.deepEqual(updates[0], { $inc: { processedCount: 1, successCount: 1 } });
  assert.equal(updates[1].$inc.failureCount, 1);
  assert.equal(updates[1].$push.rowErrors.rowNumber, 3);
  assert.equal(updates[1].$push.rowErrors.stage, "import");
  assert.equal(updates[2].$set.status, "completed");
});
