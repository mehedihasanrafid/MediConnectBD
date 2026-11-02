import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { DoctorAppointment } from "../../../shared/types";
import type { ScheduleOverview } from "../components/DoctorScheduleSection";
import { DoctorHeader } from "../../navigation/DoctorHeader";
import { DoctorSidebar } from "../../navigation/DoctorSidebar";
import { DoctorWelcomeHeader } from "../components/DoctorWelcomeHeader";
import { NextAppointmentCard } from "../components/NextAppointmentCard";
import { OperationalKpiCards } from "../components/OperationalKpiCards";
import { PracticeStatusWidget } from "../components/PracticeStatusWidget";
import { ScheduleSummaryWidget } from "../components/ScheduleSummaryWidget";
import { TodayQueuePreview } from "../components/TodayQueuePreview";
import { DoctorLayout } from "../../../layouts/DoctorLayout";

vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      firstName: "Mahmudur",
      lastName: "Rahman",
      roles: ["DOCTOR"],
      email: "mahmudur@mediconnect.bd",
      doctorProfile: { id: "doc-1", applicationStatus: "APPROVED" },
    },
    loading: false,
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("Doctor Portal Layout & Operational Dashboard (Phase 2)", () => {
  const dummyDoctor = {
    id: "u-1",
    firstName: "Mahmudur",
    lastName: "Rahman",
    roles: ["DOCTOR"],
    email: "mahmudur@mediconnect.bd",
    status: "ACTIVE" as const,
    patientProfileId: null,
    doctorProfile: { id: "doc-1", applicationStatus: "APPROVED" as const },
  };

  const dummyProfile = {
    id: "doc-1",
    userId: "u-1",
    bmdcNumber: "A-54321",
    degrees: "MBBS, FCPS",
    experienceYears: 10,
    applicationStatus: "APPROVED" as const,
    videoConsultationFee: 1200,
    specialties: [{ id: "s1", name: "Cardiology" }],
    chambers: [{ id: "c1", roomOrUnit: "Room 302", consultationFee: 1500, isActive: true, hospital: { id: "h1", name: "Apollo Dhaka", slug: "apollo", area: "Bashundhara", address: "Dhaka" } }],
  } as any;

  // Today in Dhaka
  const todayDhaka = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

  const dummyTodayAppointments: DoctorAppointment[] = [
    {
      id: "appt-101",
      patientProfileId: "pat-1",
      doctorId: "doc-1",
      holdId: "h-1",
      scheduledStartAt: `${todayDhaka}T10:00:00Z`,
      scheduledEndAt: `${todayDhaka}T10:20:00Z`,
      mode: "VIDEO",
      status: "CONFIRMED",
      feeAmount: 1200,
      paymentRequired: false,
      paymentReference: "PAY-1",
      cancellationReason: null,
      createdAt: `${todayDhaka}T08:00:00Z`,
      updatedAt: `${todayDhaka}T08:00:00Z`,
      slot: {
        id: "slot-1",
        doctorId: "doc-1",
        startAt: `${todayDhaka}T10:00:00Z`,
        endAt: `${todayDhaka}T10:20:00Z`,
        mode: "VIDEO",
        feeAmount: 1200,
        chamber: null,
      },
      patient: {
        id: "pat-1",
        userId: "u-p1",
        firstName: "Tariqul",
        lastName: "Islam",
        email: "tariqul@example.com",
        phone: "+8801700000000",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
      },
    },
    {
      id: "appt-102",
      patientProfileId: "pat-2",
      doctorId: "doc-1",
      holdId: "h-2",
      scheduledStartAt: `${todayDhaka}T11:00:00Z`,
      scheduledEndAt: `${todayDhaka}T11:20:00Z`,
      mode: "CHAMBER",
      status: "COMPLETED",
      feeAmount: 1500,
      paymentRequired: false,
      paymentReference: "PAY-2",
      cancellationReason: null,
      createdAt: `${todayDhaka}T08:00:00Z`,
      updatedAt: `${todayDhaka}T11:20:00Z`,
      slot: {
        id: "slot-2",
        doctorId: "doc-1",
        startAt: `${todayDhaka}T11:00:00Z`,
        endAt: `${todayDhaka}T11:20:00Z`,
        mode: "CHAMBER",
        feeAmount: 1500,
        chamber: { id: "c1", roomOrUnit: "Room 302" },
      },
      patient: {
        id: "pat-2",
        userId: "u-p2",
        firstName: "Farhana",
        lastName: "Akter",
        email: "farhana@example.com",
        phone: "+8801800000000",
        gender: "FEMALE",
        dateOfBirth: "1992-05-10",
      },
    },
  ];

  const dummySchedule: ScheduleOverview = {
    timezone: "Asia/Dhaka",
    rules: [
      {
        id: "r1",
        dayOfWeek: new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })).getDay(),
        startTime: "18:00:00",
        endTime: "21:00:00",
        slotDurationMinutes: 20,
        mode: "VIDEO",
        isActive: true,
      },
    ],
    timeOff: [],
  };

  it("renders DoctorSidebar with navigation hierarchy, doctor card, and sign out", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor"]}>
        <DoctorSidebar />
      </MemoryRouter>,
    );

    expect(html).toContain("MediConnect BD");
    expect(html).toContain("Doctor");
    expect(html).toContain("Workspace");
    expect(html).toContain("Overview");
    expect(html).toContain("Appointments");
    expect(html).toContain("Prescriptions");
    expect(html).toContain("Practice Management");
    expect(html).toContain("Schedule &amp; Leave");
    expect(html).toContain("Profile &amp; Chambers");
    expect(html).toContain("Earnings");
    expect(html).toContain("Account");
    expect(html).toContain("Settings");
    expect(html).toContain("Help &amp; Support");
    expect(html).toContain("Mahmudur");
    expect(html).toContain("Rahman");
    expect(html).toContain("Approved");
    expect(html).toContain("Sign Out");
  });

  it("renders DoctorHeader with breadcrumb context, Asia/Dhaka time, and account trigger", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor"]}>
        <DoctorHeader onToggleMobile={vi.fn()} isMobileOpen={false} />
      </MemoryRouter>,
    );

    expect(html).toContain("Doctor Portal");
    expect(html).toContain("Clinical Overview");
    expect(html).toContain("Asia/Dhaka");
    expect(html).toContain("Mahmudur");
  });

  it("renders DoctorLayout without public website header", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor"]}>
        <Routes>
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<div>Doctor Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Doctor Dashboard Content");
    expect(html).toContain("Doctor Portal");
    expect(html).toContain("Workspace");
    // Ensure public navbar links (such as 'Find Doctors' or public footer) are absent
    expect(html).not.toContain("Find Doctors");
    expect(html).not.toContain("Emergency 999");
  });

  it("renders DoctorWelcomeHeader with doctor name, BMDC badge, and schedule button", () => {
    const html = renderToString(
      <DoctorWelcomeHeader
        user={dummyDoctor}
        profile={dummyProfile}
        isApproved={true}
        onViewSchedule={vi.fn()}
      />,
    );

    expect(html).toContain("Mahmudur");
    expect(html).toContain("Rahman");
    expect(html).toContain("BMDC Registration: #");
    expect(html).toContain("A-54321");
    expect(html).toContain("Specialty: Cardiology");
    expect(html).toContain("Credentials: MBBS, FCPS");
    expect(html).toContain("Application Approved");
    expect(html).toContain("View Schedule");
  });

  it("renders OperationalKpiCards with real Dhaka-filtered metrics", () => {
    const html = renderToString(
      <OperationalKpiCards appointments={dummyTodayAppointments} />,
    );

    expect(html).toContain("Scheduled Today");
    expect(html).toContain("2");
    expect(html).toContain("1 Video · 1 Chamber");
    expect(html).toContain("Upcoming Today");
    expect(html).toContain("Completed Today");
    expect(html).toContain("1");
    expect(html).toContain("Needs Attention");
  });

  it("renders NextAppointmentCard with patient details and contextual actions", () => {
    const html = renderToString(
      <MemoryRouter>
        <NextAppointmentCard
          appointment={dummyTodayAppointments[0]}
          onInspectPatientHistory={vi.fn()}
          onOpenIssuePrescription={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Next Scheduled Consultation");
    expect(html).toContain("Tariqul Islam");
    expect(html).toContain("Telehealth Video");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Launch Telehealth Call");
    expect(html).toContain("Clinical History");
    expect(html).toContain("Write Rx");
  });

  it("renders NextAppointmentCard empty state when no upcoming appointments remain", () => {
    const html = renderToString(
      <MemoryRouter>
        <NextAppointmentCard
          appointment={null}
          onInspectPatientHistory={vi.fn()}
          onOpenIssuePrescription={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Queue Cleared for Today");
    expect(html).toContain("No pending consultations requiring immediate attention");
    expect(html).toContain("View Full Appointment History");
  });

  it("renders TodayQueuePreview table with appointment records and quick buttons", () => {
    const html = renderToString(
      <MemoryRouter>
        <TodayQueuePreview
          appointments={dummyTodayAppointments}
          onInspectPatientHistory={vi.fn()}
          onOpenIssuePrescription={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Patient Queue");
    expect(html).toContain("Consultations");
    expect(html).toContain("View Full Queue");
    expect(html).toContain("Tariqul Islam");
    expect(html).toContain("Farhana Akter");
    expect(html).toContain("Video");
    expect(html).toContain("Chamber");
  });

  it("renders PracticeStatusWidget with approved directory listing and chamber details", () => {
    const html = renderToString(
      <PracticeStatusWidget
        profile={dummyProfile}
        schedule={dummySchedule}
        onOpenEditProfile={vi.fn()}
        onProfileUpdated={vi.fn()}
      />,
    );

    expect(html).toContain("Practice Status");
    expect(html).toContain("Application Approved");
    expect(html).toContain("Directory Listing Active");
    expect(html).toContain("BMDC #");
    expect(html).toContain("A-54321");
    expect(html).toContain("Video Consult Fee");
    expect(html).toContain("৳1200.00");
    expect(html).toContain("Chamber");
    expect(html).toContain("Edit Practice Profile &amp; Fees");
  });

  it("renders ScheduleSummaryWidget with active sessions for today", () => {
    const html = renderToString(
      <ScheduleSummaryWidget
        schedule={dummySchedule}
        isApproved={true}
        onOpenManageSchedule={vi.fn()}
      />,
    );

    expect(html).toContain("Sessions");
    expect(html).toContain("18:00");
    expect(html).toContain("21:00");
    expect(html).toContain("Video");
    expect(html).toContain("slots");
    expect(html).toContain("Manage Weekly Schedule");
  });
});
