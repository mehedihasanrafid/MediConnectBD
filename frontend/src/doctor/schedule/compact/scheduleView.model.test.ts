import { describe, expect, it } from "vitest";
import { emergencyLeaveValues } from "./scheduleView.model";

describe("emergency leave in Dhaka time", () => {
  it("uses Dhaka's date and time across UTC midnight", () => {
    expect(emergencyLeaveValues("two-hours", new Date("2026-11-04T23:15:00Z"), "Duty")).toEqual({
      date: "2026-11-05", isFullDay: false, startTime: "05:15", endTime: "07:15", reason: "Duty",
    });
  });
  it("caps a period at today's end instead of sending an invalid overnight block", () => {
    expect(emergencyLeaveValues("two-hours", new Date("2026-11-04T17:30:00Z"), "").endTime).toBe("23:59");
    expect(emergencyLeaveValues("today", new Date("2026-11-04T17:30:00Z"), "").startTime).toBe("23:30");
  });
  it("calculates tomorrow from Dhaka's calendar and rolls over the year", () => {
    expect(emergencyLeaveValues("tomorrow", new Date("2026-12-31T17:30:00Z"), "")).toEqual({
      date: "2027-01-01", isFullDay: true, startTime: "", endTime: "", reason: "",
    });
  });
  it("asks for tomorrow when there is no representable period left today", () => {
    expect(() => emergencyLeaveValues("today", new Date("2026-11-04T17:59:00Z"), "")).toThrow("Choose tomorrow");
  });
});
