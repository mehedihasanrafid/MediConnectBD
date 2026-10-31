import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { DoctorAppointment, DoctorEarningsSummary, Prescription } from "../../../shared/types";
import { DoctorDashboardHeader } from "../components/DoctorDashboardHeader";
import { DoctorKpiCards } from "../components/DoctorKpiCards";
import { DoctorPracticeAnalytics } from "../components/DoctorPracticeAnalytics";
import { EmergencyLeaveModal } from "../components/EmergencyLeaveModal";
import { FastRxBundle, FastRxModal } from "../components/FastRxModal";
import { QuickPracticeTools } from "../components/QuickPracticeTools";
import { TodayPatientRadar } from "../components/TodayPatientRadar";

vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1", firstName: "Mahmudur", lastName: "Rahman", role: "DOCTOR" },
    loading: false,
  }),
}));

describe("DoctorDashboard Clinical Command Center Components", () => {
  const dummyAppointments = [
    {
      id: "appt-1",
      patientProfileId: "patient-1",
      scheduledStartAt: "2026-10-31T14:00:00Z",
      scheduledEndAt: "2026-10-31T14:20:00Z",
      mode: "VIDEO",
      status: "CONFIRMED",
      feeAmount: 1200,
      patient: {
        id: "p1",
        userId: "u1",
        email: "tariqul@example.com",
        firstName: "Tariqul",
        lastName: "Islam",
        phone: "+8801711000000",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
      },
    },
    {
      id: "appt-2",
      patientProfileId: "patient-2",
      scheduledStartAt: "2026-10-31T15:00:00Z",
      scheduledEndAt: "2026-10-31T15:20:00Z",
      mode: "CHAMBER",
      status: "CONFIRMED",
      feeAmount: 1500,
      patient: {
        id: "p2",
        userId: "u2",
        email: "nasreen@example.com",
        firstName: "Nasreen",
        lastName: "Akter",
        phone: "+8801811000000",
        gender: "FEMALE",
        dateOfBirth: "1992-05-10",
      },
    },
  ] as unknown as DoctorAppointment[];

  const dummyEarnings: DoctorEarningsSummary = {
    totals: {
      completedConsultations: 12,
      succeededPayments: 10,
      grossAmount: "15000",
      commissionAmount: "1500",
      netAmount: "13500",
    },
    byMonth: [
      {
        period: "2026-10",
        appointmentsCount: 10,
        grossAmount: "15000",
        commissionAmount: "1500",
        netAmount: "13500",
      },
    ],
    byDay: [
      {
        period: "2026-10-31",
        appointmentsCount: 2,
        grossAmount: "2700",
        commissionAmount: "270",
        netAmount: "2430",
      },
    ],
  };

  const dummyPrescriptions = [
    {
      id: "rx-1",
      appointmentId: "appt-1",
      patientProfileId: "patient-1",
      doctorProfileId: "doc-1",
      diagnosis: "Acute Bronchitis",
      advice: "Drink warm fluids",
      medicines: [
        {
          name: "Azithromycin",
          dosage: "500mg",
          duration: "5 days",
          frequency: "1+0+0",
        },
      ],
      createdAt: "2026-10-31T10:00:00Z",
      updatedAt: "2026-10-31T10:00:00Z",
    },
  ] as unknown as Prescription[];

  const dummyBundle: FastRxBundle = {
    id: "bundle-flu",
    title: "Respiratory Viral Flu Bundle",
    category: "Internal Medicine",
    diagnosis: "Acute Viral Pharyngitis",
    medicines: [
      {
        name: "Tab. Napa Extra",
        dosage: "1 tab",
        frequency: "1+1+1",
        duration: "5 days",
        instruction: "After meals",
      },
    ],
    advice: "Drink warm fluids and steam inhalation.",
    tests: ["Complete Blood Count (CBC)"],
  };

  it("renders DoctorDashboardHeader with BMDC badge and specialty pill", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorDashboardHeader
          bmdcNumber="A-54321"
          degrees="MBBS, FCPS (Medicine)"
          experienceYears={12}
          specialties={[{ id: "s1", name: "Cardiology" }]}
          todayAppointmentsCount={2}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("BMDC #");
    expect(html).toContain("A-54321");
    expect(html).toContain("MBBS, FCPS (Medicine)");
    expect(html).toContain("12");
    expect(html).toContain("years experience");
    expect(html).toContain("Cardiology");
    expect(html).toContain("Dr. Mahmudur Rahman");
  });

  it("renders DoctorKpiCards with active consultations and net doctor payout", () => {
    const html = renderToString(
      <DoctorKpiCards
        appointments={dummyAppointments}
        earnings={dummyEarnings}
        prescriptions={dummyPrescriptions}
      />,
    );

    expect(html).toContain("Active Consultations");
    expect(html).toContain("2");
    expect(html).toContain("Telehealth");
    expect(html).toContain("Chamber");
    expect(html).toContain("Net Doctor Payout");
    expect(html).toContain("Patient Satisfaction");
    expect(html).toContain("Prescriptions Issued");
  });

  it("renders TodayPatientRadar with search toolbar, triage pills, and patient cards", () => {
    const html = renderToString(
      <MemoryRouter>
        <TodayPatientRadar
          appointments={dummyAppointments}
          onInspectPatientHistory={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Patient Radar");
    expect(html).toContain("in Queue");
    expect(html).toContain("Search today&#x27;s queue");
    expect(html).toContain("All (");
    expect(html).toContain("Video (");
    expect(html).toContain("Chamber (");
    expect(html).toContain("Tariqul Islam");
    expect(html).toContain("Nasreen Akter");
    expect(html).toContain("Telehealth Video");
    expect(html).toContain("Chamber Visit");
    expect(html).toContain("Launch Telehealth Call");
    expect(html).toContain("Clinical History");
    expect(html).toContain("Mark Done");
    expect(html).toContain("Write E-Prescription");
  });

  it("renders DoctorPracticeAnalytics with 7-day influx chart and efficiency metrics", () => {
    const html = renderToString(
      <DoctorPracticeAnalytics
        appointments={dummyAppointments}
        earnings={dummyEarnings}
      />,
    );

    expect(html).toContain("Clinical Practice Analytics");
    expect(html).toContain("Daily Clinical Volume");
    expect(html).toContain("Telehealth Video");
    expect(html).toContain("Chamber Visit");
    expect(html).toContain("Completion Rate");
    expect(html).toContain("Avg. Consult Time");
    expect(html).toContain("Peak Clinical Hours");
    expect(html).toContain("17:00 – 21:00");
  });

  it("renders FastRxModal with drug dosages, instructions, and tests", () => {
    const html = renderToString(
      <MemoryRouter>
        <FastRxModal
          bundle={dummyBundle}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Respiratory Viral Flu Bundle");
    expect(html).toContain("Internal Medicine");
    expect(html).toContain("Acute Viral Pharyngitis");
    expect(html).toContain("Tab. Napa Extra");
    expect(html).toContain("1 tab");
    expect(html).toContain("Drink warm fluids");
    expect(html).toContain("Complete Blood Count (CBC)");
    expect(html).toContain("Apply to New Prescription");
  });

  it("renders EmergencyLeaveModal with blackout presets", () => {
    const html = renderToString(
      <EmergencyLeaveModal
        isOpen={true}
        onClose={vi.fn()}
        onScheduleChanged={vi.fn()}
      />,
    );

    expect(html).toContain("Emergency Practice Blackout");
    expect(html).toContain("Block Rest of Today");
    expect(html).toContain("Emergency Hospital Duty (+2 Hours)");
    expect(html).toContain("Tomorrow Full Day Leave");
    expect(html).toContain("Apply Blackout Now");
  });

  it("renders QuickPracticeTools with chamber delay, Fast-RX presets, and emergency button", () => {
    const html = renderToString(
      <MemoryRouter>
        <QuickPracticeTools />
      </MemoryRouter>,
    );

    expect(html).toContain("Practice Tools");
    expect(html).toContain("Chamber Delay Broadcast");
    expect(html).toContain("+15m Delay");
    expect(html).toContain("+30m Delay");
    expect(html).toContain("Fast-RX Protocol Presets");
    expect(html).toContain("Respiratory Viral Flu Bundle");
    expect(html).toContain("Emergency Chamber Blackout");
    expect(html).toContain("Telehealth Audio/Video Check");
  });
});
