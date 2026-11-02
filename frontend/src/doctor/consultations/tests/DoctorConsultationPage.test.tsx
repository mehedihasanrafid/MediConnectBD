import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DoctorConsultationPage } from "../DoctorConsultationPage";
import * as useDoctorConsultationModule from "../hooks/useDoctorConsultation";

vi.mock("../hooks/useDoctorConsultation");

describe("DoctorConsultationPage Clinical Workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Telehealth Video workspace with waiting lobby card when room is too early", () => {
    vi.spyOn(useDoctorConsultationModule, "useDoctorConsultation").mockReturnValue({
      appointment: {
        id: "appt-video-1",
        patientProfileId: "pat-1",
        scheduledStartAt: "2026-11-05T10:00:00Z",
        scheduledEndAt: "2026-11-05T10:20:00Z",
        mode: "VIDEO",
        status: "CONFIRMED",
        feeAmount: 1200,
        patient: {
          id: "p-1",
          firstName: "Rafiqul",
          lastName: "Hasan",
          phone: "+8801711223344",
          email: "rafiqul@example.com",
        },
      } as any,
      loading: false,
      error: null,
      videoSession: null,
      videoStatus: "TOO_EARLY",
      videoError: "Consultation room opens 5 minutes before scheduled start time.",
      existingPrescription: null,
      clinicalNotes: {
        chiefComplaint: "",
        clinicalFindings: "",
        diagnosis: "",
        medicines: [],
        tests: [],
        advice: "",
      },
      vitals: {},
      busy: false,
      updateClinicalNotes: vi.fn(),
      updateVitals: vi.fn(),
      applyFastRxBundle: vi.fn(),
      completeConsultation: vi.fn().mockResolvedValue(true),
      registerIssuedPrescription: vi.fn(),
      reload: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor/consultations/appt-video-1"]}>
        <Routes>
          <Route path="/doctor/consultations/:appointmentId" element={<DoctorConsultationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Header
    expect(html).toContain("Rafiqul Hasan");
    expect(html).toContain("Telehealth Video");
    expect(html).toContain("Confirmed");

    // Telehealth Waiting Card
    expect(html).toContain("Telehealth Session Not Yet Active");
    expect(html).toContain("Consultation room opens 5 minutes before scheduled start time.");
    expect(html).toContain("Check Room Status");

    // Clinical Notes Panel
    expect(html).toContain("Clinical Documentation");
    expect(html).toContain("Chief Complaint");
    expect(html).toContain("Provisional / Final Diagnosis");
    expect(html).toContain("Patient EHR History");
    expect(html).toContain("Author Digital Prescription");
    expect(html).toContain("Mark Consultation Completed");
  });

  it("renders In-Person Chamber workspace without video frame, displaying clinic and vitals", () => {
    vi.spyOn(useDoctorConsultationModule, "useDoctorConsultation").mockReturnValue({
      appointment: {
        id: "appt-chamber-1",
        patientProfileId: "pat-2",
        scheduledStartAt: "2026-11-05T17:00:00Z",
        scheduledEndAt: "2026-11-05T17:30:00Z",
        mode: "CHAMBER",
        status: "CONFIRMED",
        feeAmount: 1500,
        paymentRequired: true,
        paymentReference: "TRX-987654",
        slot: {
          chamber: {
            id: "cham-1",
            roomOrUnit: "Room 402",
            hospital: {
              name: "Popular Diagnostic Center",
              address: "House 16, Road 2",
              area: "Dhanmondi",
            },
          },
        },
        patient: {
          id: "p-2",
          firstName: "Farida",
          lastName: "Begum",
          phone: "+8801811223344",
          email: "farida@example.com",
        },
      } as any,
      loading: false,
      error: null,
      videoSession: null,
      videoStatus: "CHECKING",
      videoError: null,
      existingPrescription: null,
      clinicalNotes: {
        chiefComplaint: "Acute lower back pain for 5 days",
        clinicalFindings: "Lumbosacral tenderness, straight leg raise negative",
        diagnosis: "Mechanical Lower Back Strain",
        medicines: [],
        tests: [],
        advice: "Avoid heavy lifting, apply lumbar heat pack",
      },
      vitals: {
        bpSystolic: "125",
        bpDiastolic: "82",
        pulse: "76",
        temperature: "98.6",
        weightKg: "64",
      },
      busy: false,
      updateClinicalNotes: vi.fn(),
      updateVitals: vi.fn(),
      applyFastRxBundle: vi.fn(),
      completeConsultation: vi.fn().mockResolvedValue(true),
      registerIssuedPrescription: vi.fn(),
      reload: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor/consultations/appt-chamber-1"]}>
        <Routes>
          <Route path="/doctor/consultations/:appointmentId" element={<DoctorConsultationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Header
    expect(html).toContain("Farida Begum");
    expect(html).toContain("In-Person Chamber");

    // Chamber Desk View
    expect(html).toContain("Popular Diagnostic Center");
    expect(html).toContain("Dhanmondi");
    expect(html).toContain("Unit/Room: Room 402");
    expect(html).toContain("Patient Intake Vitals (Clinical Scratchpad)");
    expect(html).toContain("BP Systolic (mmHg)");
    expect(html).toContain("125");
    expect(html).toContain("82");
    expect(html).toContain("76");

    // Does NOT render video frame
    expect(html).not.toContain("Telehealth Session Not Yet Active");
    expect(html).not.toContain("iframe");

    // Clinical Notes Panel
    expect(html).toContain("Mechanical Lower Back Strain");
    expect(html).toContain("Mark Consultation Completed");
  });

  it("renders error state when appointment is missing or not assigned", () => {
    vi.spyOn(useDoctorConsultationModule, "useDoctorConsultation").mockReturnValue({
      appointment: null,
      loading: false,
      error: "Appointment not found or not assigned to your clinical account.",
      videoSession: null,
      videoStatus: "ERROR",
      videoError: null,
      existingPrescription: null,
      clinicalNotes: {} as any,
      vitals: {},
      busy: false,
      updateClinicalNotes: vi.fn(),
      updateVitals: vi.fn(),
      applyFastRxBundle: vi.fn(),
      completeConsultation: vi.fn(),
      registerIssuedPrescription: vi.fn(),
      reload: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor/consultations/missing-appt"]}>
        <Routes>
          <Route path="/doctor/consultations/:appointmentId" element={<DoctorConsultationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Appointment not found or not assigned");
    expect(html).toContain("Return to Appointment Queue");
  });
});
