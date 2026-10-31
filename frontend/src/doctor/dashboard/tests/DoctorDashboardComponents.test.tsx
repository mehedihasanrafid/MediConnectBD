import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { DoctorAppointment, DoctorEarningsSummary, Prescription } from "../../../shared/types";
import { DoctorDashboardHeader } from "../components/DoctorDashboardHeader";
import { DoctorKpiCards } from "../components/DoctorKpiCards";
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

  it("renders TodayPatientRadar with patient queue cards and direct actions", () => {
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
    expect(html).toContain("Tariqul Islam");
    expect(html).toContain("Nasreen Akter");
    expect(html).toContain("Telehealth Video");
    expect(html).toContain("Chamber Visit");
    expect(html).toContain("Launch Telehealth Call");
    expect(html).toContain("Clinical History");
    expect(html).toContain("Write E-Prescription");
  });

  it("renders QuickPracticeTools with chamber delay and Fast-RX bundles", () => {
    const html = renderToString(
      <MemoryRouter>
        <QuickPracticeTools />
      </MemoryRouter>,
    );

    expect(html).toContain("Practice Tools");
    expect(html).toContain("Chamber Delay Broadcast");
    expect(html).toContain("+15m Delay");
    expect(html).toContain("+30m Delay");
    expect(html).toContain("Fast-RX Bundles");
    expect(html).toContain("Respiratory Viral Flu Bundle");
    expect(html).toContain("Telehealth Audio/Video Check");
  });
});
