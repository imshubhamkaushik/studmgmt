import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useStudentFilters from "../useStudentFilters";

// useStudentFilters takes a React Router setSearchParams setter directly.
// We render it with a mock setter, capture the updater function each
// action passes in, then run that updater against a starting
// URLSearchParams to see what it produces.
function runFilters(startingParams, run) {
  let captured;
  let capturedOptions;
  const setSearchParams = vi.fn((updaterOrValue, options) => {
    captured = updaterOrValue;
    capturedOptions = options;
  });
  const { result } = renderHook(() => useStudentFilters(setSearchParams));
  run(result.current);
  const current = new URLSearchParams(startingParams);
  const next =
    typeof captured === "function" ? captured(current) : captured;
  return { next, options: capturedOptions, setSearchParams };
}

describe("useStudentFilters", () => {
  it("setPage removes the page param entirely for page 1", () => {
    const { next } = runFilters("page=4", (f) => f.setPage(1));
    expect(next.has("page")).toBe(false);
  });

  it("setPage sets the page param for page > 1", () => {
    const { next } = runFilters("", (f) => f.setPage(3));
    expect(next.get("page")).toBe("3");
  });

  it("setClass sets the class param and resets pagination back to page 1", () => {
    const { next, options } = runFilters("page=5", (f) => f.setClass("10"));
    expect(next.get("class")).toBe("10");
    expect(next.has("page")).toBe(false);
    expect(options).toEqual({ replace: true });
  });

  it("setStatus removes the param entirely when cleared", () => {
    const { next } = runFilters("status=active", (f) => f.setStatus(""));
    expect(next.has("status")).toBe(false);
  });

  it("setSortBy omits the param when set back to the default value", () => {
    const { next } = runFilters("sortBy=name", (f) => f.setSortBy("createdAt"));
    expect(next.has("sortBy")).toBe(false);
  });

  it("clearFilters replaces the params with an empty set", () => {
    const setSearchParams = vi.fn();
    const { result } = renderHook(() => useStudentFilters(setSearchParams));
    result.current.clearFilters();
    expect(setSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true },
    );
    const [params] = setSearchParams.mock.calls[0];
    expect([...params.keys()]).toHaveLength(0);
  });
});
