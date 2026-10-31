import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AppointmentsPage } from "../AppointmentsPage";
import { PatientBreadcrumbs } from "../../components/PatientBreadcrumbs";

vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "p-1", firstName: "Test", lastName: "Patient", roles: ["PATIENT"] },
    loading: false,
  }),
}));

vi.mock("../hooks/usePatientAppointments", () => ({
  usePatientAppointments: () => ({
    appointments: [
      {
        id: "appt-p1",
        mode: "VIDEO",
        status: "CONFIRMED",
        scheduledStartAt: "2026-11-01T10:00:00Z",
        scheduledEndAt: "2026-11-01T10:20:00Z",
        feeAmount: 1200,
        patientProfileId: "patient-1",
        doctorProfileId: "doctor-1",
        doctorId: "doc-1",
      },
      {
        id: "appt-p2",
        mode: "CHAMBER",
        status: "COMPLETED",
        scheduledStartAt: "2026-10-25T14:00:00Z",
        scheduledEndAt: "2026-10-25T14:20:00Z",
        feeAmount: 1500,
        patientProfileId: "patient-1",
        doctorProfileId: "doctor-2",
        doctorId: "doc-2",
      },
    ],
    reviewsByAppointment: {},
    loading: false,
    error: null,
    loadAll: vi.fn(),
    handleRescheduled: vi.fn(),
    handleCancelled: vi.fn(),
    handleReviewCreated: vi.fn(),
  }),
}));

describe("Patient Portal Desktop Ergonomics", () => {
  it("renders PatientBreadcrumbs with trail and sync indicators", () => {
    const html = renderToString(
      <MemoryRouter>
        <PatientBreadcrumbs activePageLabel="My Appointments & Consultations" />
      </MemoryRouter>,
    );

    expect(html).toContain("Patient Portal");
    expect(html).toContain("My Health Records");
    expect(html).toContain("My Appointments &amp; Consultations");
    expect(html).toContain("Realtime Synced");
    expect(html).toContain("Encrypted Records");
  });

  it("renders AppointmentsPage with tabs, search toolbar, filter pills, and status bar", () => {
    const html = renderToString(
      <MemoryRouter>
        <AppointmentsPage />
      </MemoryRouter>,
    );

    expect(html).toContain("My Appointments");
    expect(html).toContain("Book New Consultation");
    expect(html).toContain("Active &amp; Upcoming");
    expect(html).toContain("Completed &amp; Past Visits");
    expect(html).toContain("Search by appointment ID");
    expect(html).toContain("All (");
    expect(html).toContain("Video (");
    expect(html).toContain("Chamber (");
    expect(html).toContain("Daily.co WebRTC HD: Connected");
    expect(html).toContain("Encrypted Patient Vault");
  });
});
