import test from "node:test";
import assert from "node:assert/strict";
import { computeOverallPercent } from "../src/services/report-card.service.js";

test("averages only graded subjects, ignoring ones with no percent yet", () => {
  const grades = [{ percent: 80 }, { percent: 60 }, { percent: null }];
  assert.equal(computeOverallPercent(grades), 70);
});

test("returns null when nothing has been graded yet", () => {
  assert.equal(computeOverallPercent([{ percent: null }]), null);
});

test("rounds to two decimal places", () => {
  const grades = [{ percent: 81 }, { percent: 79 }, { percent: 88 }];
  assert.equal(computeOverallPercent(grades), 82.67);
});
