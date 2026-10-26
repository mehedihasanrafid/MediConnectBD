import { describe, expect, it } from "vitest";
import { ApiRequestError, getErrorMessage } from "./apiError";

describe("ApiRequestError & getErrorMessage", () => {
  it("preserves status, code, and message on ApiRequestError", () => {
    const err = new ApiRequestError(409, "SLOT_UNAVAILABLE", "Slot already taken");
    expect(err.status).toBe(409);
    expect(err.code).toBe("SLOT_UNAVAILABLE");
    expect(getErrorMessage(err)).toBe("Slot already taken");
  });

  it("includes fieldErrors when present on a 422 validation error", () => {
    const err = new ApiRequestError(422, "VALIDATION_FAILED", "Invalid input", [
      { path: "email", message: "Invalid email" },
    ]);
    expect(getErrorMessage(err)).toBe("Invalid input: email (Invalid email)");
  });

  it("falls back gracefully for non-Error values", () => {
    expect(getErrorMessage("unexpected", "Fallback error")).toBe("Fallback error");
  });
});
