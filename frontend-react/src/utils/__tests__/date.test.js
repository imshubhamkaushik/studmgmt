import { describe, it, expect } from "vitest";
import {
  isValidDateInput,
  toDateInputValue,
  formatDate,
  formatDateOnly,
} from "../date";

describe("isValidDateInput", () => {
  it("accepts a real calendar date in YYYY-MM-DD form", () => {
    expect(isValidDateInput("2015-03-20")).toBe(true);
  });

  it("rejects a date with the wrong number of days for its month", () => {
    expect(isValidDateInput("2015-02-30")).toBe(false);
  });

  it("rejects values that are not in YYYY-MM-DD form", () => {
    expect(isValidDateInput("20-03-2015")).toBe(false);
    expect(isValidDateInput("not-a-date")).toBe(false);
    expect(isValidDateInput("")).toBe(false);
  });

  it("correctly rejects Feb 29 on a non-leap year but accepts it on a leap year", () => {
    expect(isValidDateInput("2023-02-29")).toBe(false);
    expect(isValidDateInput("2024-02-29")).toBe(true);
  });
});

describe("toDateInputValue", () => {
  it("converts an ISO timestamp to a YYYY-MM-DD input value using UTC", () => {
    expect(toDateInputValue("2015-03-20T00:00:00.000Z")).toBe("2015-03-20");
  });

  it("returns an empty string for missing or invalid input", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
    expect(toDateInputValue("not-a-date")).toBe("");
  });
});

describe("formatDate / formatDateOnly", () => {
  it("returns a placeholder dash for missing or invalid values", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("garbage")).toBe("-");
    expect(formatDateOnly(null)).toBe("-");
    expect(formatDateOnly("garbage")).toBe("-");
  });

  it("formats a valid date without throwing", () => {
    expect(formatDate("2015-03-20T00:00:00.000Z")).toMatch(/2015/);
    expect(formatDateOnly("2015-03-20T00:00:00.000Z")).toMatch(/2015/);
  });
});
