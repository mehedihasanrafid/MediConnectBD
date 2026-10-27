import { describe, expect, it } from "vitest";

import { appointmentStatusTone } from "./statusTone";

describe("appointmentStatusTone", () => {
  it("maps appointment statuses to semantic badge tones", () => {
    expect(appointmentStatusTone("CONFIRMED")).toBe("success");
    expect(appointmentStatusTone("COMPLETED")).toBe("success");
    expect(appointmentStatusTone("PENDING_PAYMENT")).toBe("warning");
    expect(appointmentStatusTone("CANCELLED")).toBe("danger");
    expect(appointmentStatusTone("PAYMENT_EXPIRED")).toBe("danger");
    expect(appointmentStatusTone("NO_SHOW")).toBe("danger");
    expect(appointmentStatusTone("UNKNOWN")).toBe("neutral");
  });
});
