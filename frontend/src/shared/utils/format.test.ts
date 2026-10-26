import { describe, expect, it } from "vitest";
import {
  formatDhakaDate,
  formatDhakaDateTime,
  formatDhakaTime,
  formatMoney,
  formatStatus,
} from "./format";

describe("format utilities", () => {
  it("formats BDT money values with two decimal places and dash for null", () => {
    expect(formatMoney(800)).toBe("৳800.00");
    expect(formatMoney("650.5")).toBe("৳650.50");
    expect(formatMoney(null)).toBe("—");
  });

  it("converts UTC timestamps to Asia/Dhaka (+06:00) time", () => {
    // 2026-10-19T04:00:00.000Z is 10:00 in Asia/Dhaka
    const iso = "2026-10-19T04:00:00.000Z";
    expect(formatDhakaTime(iso)).toBe("10:00");
    expect(formatDhakaDate(iso)).toContain("19 Oct 2026");
    expect(formatDhakaDateTime(iso)).toContain("10:00");
  });

  it("formats backend enum statuses into readable labels", () => {
    expect(formatStatus("PENDING_PAYMENT")).toBe("Pending payment");
    expect(formatStatus("CONFIRMED")).toBe("Confirmed");
    expect(formatStatus("NO_SHOW")).toBe("No show");
  });
});
