import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DoctorSchedulePage } from "../DoctorSchedulePage";
import * as useDoctorScheduleModule from "../hooks/useDoctorSchedule";

vi.mock("../hooks/useDoctorSchedule");

describe("DoctorSchedulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders locked banner when doctor is not approved (PENDING_REVIEW)", () => {
    vi.spyOn(useDoctorScheduleModule, "useDoctorSchedule").mockReturnValue({
      profile: {
        id: "doc-1",
        userId: "user-1",
        fullName: "Dr. Farhana Yasmin",
        bmdcNumber: "BMDC-12345",
        applicationStatus: "PENDING_REVIEW",
        chambers: [],
      } as any,
      schedule: null,
      loading: false,
      error: null,
      notice: null,
      busy: false,
      generatingSlots: false,
      slotsGeneratedCount: null,
      isApproved: false,
      activeChambers: [],
      addRule: vi.fn(),
      editRule: vi.fn(),
      removeRule: vi.fn(),
      generateSlots: vi.fn(),
      addTimeOff: vi.fn(),
      removeTimeOff: vi.fn(),
      reload: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <DoctorSchedulePage />
      </MemoryRouter>,
    );

    expect(html).toContain("Schedule &amp; Leave");
    expect(html).toContain("PENDING REVIEW");
    expect(html).toContain("Practice Schedule is Locked");
    expect(html).toContain("Under Administrator Review");
    expect(html).toContain("Complete Profile &amp; Application");
    expect(html).toContain("href=\"/doctor/profile\"");
    expect(html).not.toContain("Add Working Hours");
  });

  it("renders full weekly calendar, time-off management, and slot generator when doctor is APPROVED", () => {
    vi.spyOn(useDoctorScheduleModule, "useDoctorSchedule").mockReturnValue({
      profile: {
        id: "doc-1",
        userId: "user-1",
        fullName: "Dr. Farhana Yasmin",
        bmdcNumber: "BMDC-12345",
        applicationStatus: "APPROVED",
        chambers: [
          {
            id: "cham-1",
            doctorId: "doc-1",
            hospitalId: "hosp-1",
            hospitalName: "Popular Diagnostic Center",
            hospitalArea: "Dhanmondi",
            hospitalAddress: "House 16, Road 2",
            roomNumber: "Room 402",
            consultationFee: 1200,
            followUpFee: 800,
            isActive: true,
          },
        ],
      } as any,
      schedule: {
        doctorId: "doc-1",
        rules: [
          {
            id: "rule-1",
            dayOfWeek: 0, // Sunday
            startTime: "09:00:00",
            endTime: "12:00:00",
            slotDurationMinutes: 15,
            mode: "VIDEO",
          },
          {
            id: "rule-2",
            dayOfWeek: 1, // Monday
            startTime: "17:00:00",
            endTime: "21:00:00",
            slotDurationMinutes: 20,
            mode: "CHAMBER",
            chamberId: "cham-1",
            chamber: {
              id: "cham-1",
              roomOrUnit: "Room 402",
              hospital: {
                id: "hosp-1",
                name: "Popular Diagnostic Center",
                area: "Dhanmondi",
                address: "House 16, Road 2",
              },
            },
          },
        ],
        timeOff: [
          {
            id: "to-1",
            doctorId: "doc-1",
            date: "2026-11-15",
            startTime: null,
            endTime: null,
            reason: "National Medical Conference",
          },
        ],
      },
      loading: false,
      error: null,
      notice: null,
      busy: false,
      generatingSlots: false,
      slotsGeneratedCount: null,
      isApproved: true,
      activeChambers: [
        {
          id: "cham-1",
          doctorId: "doc-1",
          hospitalId: "hosp-1",
          hospitalName: "Popular Diagnostic Center",
          hospitalArea: "Dhanmondi",
          hospitalAddress: "House 16, Road 2",
          roomNumber: "Room 402",
          consultationFee: 1200,
          followUpFee: 800,
          isActive: true,
        },
      ] as any,
      addRule: vi.fn(),
      editRule: vi.fn(),
      removeRule: vi.fn(),
      generateSlots: vi.fn(),
      addTimeOff: vi.fn(),
      removeTimeOff: vi.fn(),
      reload: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <DoctorSchedulePage />
      </MemoryRouter>,
    );

    // Header & Actions
    expect(html).toContain("Schedule &amp; Leave");
    expect(html).toContain("Application Approved");
    expect(html).toContain("Generate 7-Day Slots");
    expect(html).toContain("Add Working Hours");

    // Mode filter pills
    expect(html).toContain("All Modes");
    expect(html).toContain("Video");
    expect(html).toContain("Chamber");

    // Days in WeeklyCalendarView
    expect(html).toContain("Sunday");
    expect(html).toContain("Monday");
    expect(html).toContain("Tuesday");
    expect(html).toContain("Wednesday");
    expect(html).toContain("Thursday");
    expect(html).toContain("Friday");
    expect(html).toContain("Saturday");

    // Working blocks
    expect(html).toContain("09:00");
    expect(html).toContain("12:00");
    expect(html).toContain("17:00");
    expect(html).toContain("21:00");
    expect(html).toContain("Popular Diagnostic Center");

    // Time Off Section
    expect(html).toContain("Time Off &amp; Blocked Periods");
    expect(html).toContain("National Medical Conference");
    expect(html).toContain("Emergency Blackout");
    expect(html).toContain("Add Leave Date");
  });
});
