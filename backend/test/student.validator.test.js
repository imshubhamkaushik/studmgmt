import test from "node:test";
import assert from "node:assert/strict";
import { validateCreateStudent } from "../src/validators/student.validator.js";

const run = (body) => {
  const req = { body };
  let nextError;
  validateCreateStudent(req, {}, (error) => { nextError = error; });
  return { req, nextError };
};

test("accepts strict YYYY-MM-DD DOB and section", () => {
  const { req, nextError } = run({ name: "Alice Smith", rollNo: "1", class: "10", section: "A", dob: "2008-02-29" });
  assert.equal(nextError, undefined);
  assert.equal(req.body.rollNo, 1);
  assert.equal(req.body.section, "A");
  assert.equal(req.body.dob.toISOString().slice(0, 10), "2008-02-29");
});

test("rejects non date-only DOB", () => {
  const { nextError } = run({ name: "Alice Smith", rollNo: 1, class: "10", section: "A", dob: "02/29/2008" });
  assert.equal(nextError?.statusCode, 400);
});

test("requires section", () => {
  const { nextError } = run({ name: "Alice Smith", rollNo: 1, class: "10", dob: "2008-02-29" });
  assert.equal(nextError?.statusCode, 400);
});
