import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DoctorSchedulePage } from "../DoctorSchedulePage";
import { useDoctorSchedule } from "../hooks/useDoctorSchedule";

vi.mock("../hooks/useDoctorSchedule");
type ScheduleState = ReturnType<typeof useDoctorSchedule>;
function state(overrides: Partial<ScheduleState> = {}): ScheduleState {
  return {
    profile: { id: "doctor", bmdcNumber: "TEST", applicationStatus: "APPROVED",
      degrees: "", experienceYears: 0, bio: "", languages: [], rejectionReason: null,
      videoConsultationFee: 800, specialties: [], chambers: [] },
    schedule: { rules: [
      { id: "video", dayOfWeek: 0, startTime: "09:00:00", endTime: "12:00:00", slotDurationMinutes: 15, mode: "VIDEO" },
      { id: "chamber", dayOfWeek: 1, startTime: "17:00:00", endTime: "21:00:00", slotDurationMinutes: 20, mode: "CHAMBER",
        chamberId: "chamber", chamber: { id: "chamber", roomOrUnit: "Room 402", hospital: { name: "Synthetic Hospital" } } },
    ], timeOff: [{ id: "leave", date: "2026-11-15", startTime: null, endTime: null, reason: "Synthetic conference" }] },
    loading: false, error: null, notice: null, busy: false, generatingSlots: false,
    slotsGeneratedCount: null, isApproved: true, activeChambers: [],
    addRule: vi.fn(), editRule: vi.fn(), removeRule: vi.fn(), generateSlots: vi.fn(),
    addTimeOff: vi.fn(), removeTimeOff: vi.fn(), reload: vi.fn(), ...overrides,
  };
}
function render(value: ScheduleState) {
  vi.mocked(useDoctorSchedule).mockReturnValue(value);
  return renderToString(<MemoryRouter><DoctorSchedulePage /></MemoryRouter>).replace(/<!--.*?-->/g, "");
}
describe("DoctorSchedulePage", () => {
  beforeEach(() => vi.clearAllMocks());
  it("preserves the approval gate and hides scheduling actions for pending doctors", () => {
    const value = state();
    const html = render({ ...value, profile: { ...value.profile!, applicationStatus: "PENDING_REVIEW" },
      isApproved: false, schedule: null });
    expect(html).toContain("Schedule &amp; Leave");
    expect(html).toContain("Under Administrator Review");
    expect(html).toContain("Practice Schedule is Locked");
    expect(html).toContain('href="/doctor/profile"');
    expect(html).not.toContain("More schedule actions");
    expect(html).not.toContain("Weekly hours");
  });
  it("shows concise weekly hours and keeps secondary controls and leave details hidden", () => {
    const html = render(state());
    expect(html).toContain("Weekly hours");
    expect(html).toContain("Dhaka · UTC+6");
    expect(html).toContain("More schedule actions");
    expect(html).toContain("Leave (1)");
    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
      expect(html).toContain(`aria-label="${day}"`);
    }
    expect(html).toContain("09:00–12:00");
    expect(html).toContain("Room 402");
    for (const hidden of ["Application Approved", "Generate 7-day slots", "Synthetic conference", "Remove hours", "Emergency leave"]) {
      expect(html).not.toContain(hidden);
    }
  });
  it("shows loading and service failure without a false empty week or locked application", () => {
    expect(render(state({ loading: true }))).toContain("Loading schedule");
    const html = render(state({ profile: null, schedule: null, isApproved: false, error: "Schedule unavailable" }));
    expect(html).toContain("Schedule unavailable");
    expect(html).toContain("Retry");
    expect(html).not.toContain("Weekly hours");
    expect(html).not.toContain("Practice Schedule is Locked");
  });
});
