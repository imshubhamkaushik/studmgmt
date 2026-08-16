import { describe, it, expect } from "vitest";
import { getApiErrorMessage } from "../apiErrorMessage";

describe("getApiErrorMessage", () => {
  it("returns the fallback when there is no error", () => {
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("prefers the server message for a 400, falling back to a generic one", () => {
    expect(getApiErrorMessage({ status: 400, message: "Bad input" }, "fallback")).toBe(
      "Bad input",
    );
    expect(getApiErrorMessage({ status: 400 }, "fallback")).toBe(
      "The submitted data is invalid.",
    );
  });

  it("reports a connection problem for status 0", () => {
    expect(getApiErrorMessage({ status: 0 }, "fallback")).toBe(
      "Unable to connect to the server.",
    );
  });

  it("hides the raw server message for 5xx errors", () => {
    expect(
      getApiErrorMessage({ status: 500, message: "stack trace leak" }, "fallback"),
    ).toBe("The server encountered an unexpected problem.");
  });

  it("falls back to the provided default for an unrecognized status with no message", () => {
    expect(getApiErrorMessage({ status: 418 }, "fallback")).toBe("fallback");
  });
});
