import { describe, expect, it } from "vitest";

import {
  hasRefundablePayment,
  previewPatientRefund,
  refundAmountFor,
} from "./refund";

describe("patient cancellation refund preview", () => {
  it("calculates exact BDT refund amounts using integer paisa half-up rounding", () => {
    expect(refundAmountFor("1000.00", 100)).toBe("1000.00");
    expect(refundAmountFor("1000.00", 50)).toBe("500.00");
    expect(refundAmountFor("755.00", 50)).toBe("377.50");
    expect(refundAmountFor("1000.00", 0)).toBe("0.00");
  });

  it("applies >24h (100%), 2-24h (50%), and <2h (0%) refund tiers", () => {
    const now = new Date("2026-11-01T10:00:00.000Z");

    const moreThan24h = previewPatientRefund("2026-11-02T12:00:00.000Z", now);
    expect(moreThan24h.refundPercent).toBe(100);

    const between2And24h = previewPatientRefund("2026-11-01T18:00:00.000Z", now);
    expect(between2And24h.refundPercent).toBe(50);

    const lessThan2h = previewPatientRefund("2026-11-01T11:30:00.000Z", now);
    expect(lessThan2h.refundPercent).toBe(0);
  });

  it("identifies only confirmed video consultations as having captured online payments", () => {
    expect(hasRefundablePayment("VIDEO", "CONFIRMED")).toBe(true);
    expect(hasRefundablePayment("VIDEO", "PENDING_PAYMENT")).toBe(false);
    expect(hasRefundablePayment("CHAMBER", "CONFIRMED")).toBe(false);
  });
});
