import { describe, expect, it } from "vitest";
import { decideRefund, refundAmountFor } from "../src/modules/appointments/cancellation-policy";

const start = new Date("2026-11-01T10:00:00.000Z");
const hoursBefore = (hours: number) => new Date(start.getTime() - hours * 3_600_000);

describe("decideRefund", () => {
  it("refunds in full when a patient cancels more than 24 hours ahead", () => {
    expect(decideRefund("PATIENT", start, hoursBefore(25))).toEqual({
      refundPercent: 100,
      reason: "Cancelled more than 24 hours before the appointment",
    });
  });

  it("refunds half at exactly 24 hours", () => {
    expect(decideRefund("PATIENT", start, hoursBefore(24)).refundPercent).toBe(50);
  });

  it("refunds half between 2 and 24 hours", () => {
    expect(decideRefund("PATIENT", start, hoursBefore(12)).refundPercent).toBe(50);
  });

  it("refunds half at exactly 2 hours", () => {
    expect(decideRefund("PATIENT", start, hoursBefore(2)).refundPercent).toBe(50);
  });

  it("refunds nothing under 2 hours", () => {
    expect(decideRefund("PATIENT", start, hoursBefore(1)).refundPercent).toBe(0);
  });

  it("refunds nothing once the appointment has started", () => {
    expect(decideRefund("PATIENT", start, hoursBefore(-1)).refundPercent).toBe(0);
  });

  it("always refunds in full when a doctor cancels, even at short notice", () => {
    expect(decideRefund("DOCTOR", start, hoursBefore(0.5))).toEqual({
      refundPercent: 100,
      reason: "doctor cancelled the appointment",
    });
  });

  it("always refunds in full when an admin cancels", () => {
    expect(decideRefund("ADMIN", start, hoursBefore(0.5)).refundPercent).toBe(100);
  });
});

describe("refundAmountFor", () => {
  it("returns the full amount at 100 percent", () => {
    expect(refundAmountFor("800.00", 100)).toBe("800.00");
  });

  it("returns half the amount at 50 percent", () => {
    expect(refundAmountFor("800.00", 50)).toBe("400.00");
  });

  it("returns zero at 0 percent", () => {
    expect(refundAmountFor("800.00", 0)).toBe("0.00");
  });

  it("rounds half-up to the nearest paisa", () => {
    // 805.55 -> 80555 paisa; 50% = 40277.5 -> 40278 paisa.
    expect(refundAmountFor("805.55", 50)).toBe("402.78");
  });

  it("never exceeds the original amount", () => {
    expect(refundAmountFor("0.01", 100)).toBe("0.01");
  });

  it("rejects an out-of-range percentage", () => {
    expect(() => refundAmountFor("800.00", 101)).toThrow("Refund percent must be a whole number");
    expect(() => refundAmountFor("800.00", -1)).toThrow("Refund percent must be a whole number");
    expect(() => refundAmountFor("800.00", 12.5)).toThrow("Refund percent must be a whole number");
  });

  it("rejects a malformed amount", () => {
    expect(() => refundAmountFor("8.0.0", 50)).toThrow("Invalid monetary amount");
  });
});
