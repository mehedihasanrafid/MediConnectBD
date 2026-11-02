import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DoctorAppointmentsPage } from "../DoctorAppointmentsPage";

vi.mock("../../api/doctors", () => ({
  doctorsApi: {
    getMyProfile: vi.fn().mockResolvedValue({ bmdcNumber: "A-54321" }),
    listMyAppointments: vi.fn().mockResolvedValue({
      items: [
        {
          id: "appt-q1",
          patientProfileId: "patient-1",
          scheduledStartAt: "2026-10-31T15:00:00Z",
          scheduledEndAt: "2026-10-31T15:20:00Z",
          mode: "VIDEO",
          status: "CONFIRMED",
          feeAmount: 1200,
          patient: {
            id: "p-1",
            firstName: "Tariqul",
            lastName: "Islam",
            phone: "+8801711000000",
            email: "tariqul@example.com",
          },
        },
        {
          id: "appt-q2",
          patientProfileId: "patient-2",
          scheduledStartAt: "2026-10-31T16:00:00Z",
          scheduledEndAt: "2026-10-31T16:20:00Z",
          mode: "CHAMBER",
          status: "COMPLETED",
          feeAmount: 1500,
          patient: {
            id: "p-2",
            firstName: "Nasreen",
            lastName: "Akter",
            phone: "+8801811000000",
            email: "nasreen@example.com",
          },
        },
      ],
    }),
  },
}));

vi.mock("../../api/prescriptions", () => ({
  prescriptionsApi: {
    listDoctorPrescriptions: vi.fn().mockResolvedValue({
      items: [
        {
          id: "rx-1",
          appointmentId: "appt-q2",
          verificationCode: "MCBD-2026-TEST",
        },
      ],
    }),
  },
}));

vi.mock("../hooks/useDoctorQueue", () => ({
  useDoctorQueue: () => ({
    appointments: [
      {
        id: "appt-q1",
        patientProfileId: "patient-1",
        scheduledStartAt: "2026-10-31T15:00:00Z",
        scheduledEndAt: "2026-10-31T15:20:00Z",
        mode: "VIDEO",
        status: "CONFIRMED",
        feeAmount: 1200,
        patient: {
          id: "p-1",
          firstName: "Tariqul",
          lastName: "Islam",
          phone: "+8801711000000",
          email: "tariqul@example.com",
        },
      },
      {
        id: "appt-q2",
        patientProfileId: "patient-2",
        scheduledStartAt: "2026-10-31T16:00:00Z",
        scheduledEndAt: "2026-10-31T16:20:00Z",
        mode: "CHAMBER",
        status: "COMPLETED",
        feeAmount: 1500,
        patient: {
          id: "p-2",
          firstName: "Nasreen",
          lastName: "Akter",
          phone: "+8801811000000",
          email: "nasreen@example.com",
        },
      },
    ],
    prescriptionsByAppt: {
      "appt-q2": {
        id: "rx-1",
        appointmentId: "appt-q2",
        verificationCode: "MCBD-2026-TEST",
      },
    },
    loading: false,
    error: null,
    busyId: null,
    handleTransition: vi.fn(),
    registerCreatedPrescription: vi.fn(),
  }),
}));

describe("DoctorAppointmentsPage Clinical Workspace", () => {
  it("renders breadcrumbs, filter toolbar, active queue cards, and status bar", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Doctor Workspace");
    expect(html).toContain("Patient Appointment Queue");
    expect(html).toContain("Search queue by patient name");
    expect(html).toContain("All Modes");
    expect(html).toContain("All Statuses");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Completed");
    expect(html).toContain("Showing 2 of 2 consultations");
    expect(html).toContain("Tariqul Islam");
    expect(html).toContain("Telehealth Video");
    expect(html).toContain("Launch Telehealth Call");
    expect(html).toContain("Clinical History &amp; Reports");
    expect(html).toContain("Mark Completed");
    expect(html).toContain("View Details");
    expect(html).toContain("+88••••••00");
    expect(html).toContain("Telehealth Network: Operational");
    expect(html).toContain("BMDC #");
  });
});
