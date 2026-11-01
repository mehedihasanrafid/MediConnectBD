import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { VideoSession } from "../../../../../../../shared/types";
import { PostConsultationSummary } from "../PostConsultationSummary";

describe("PostConsultationSummary Component", () => {
  const dummyPatientSession: VideoSession = {
    appointmentId: "appt-post-1",
    roomName: "mediconnect-consult-post-1",
    roomUrl: "https://mediconnectbd.daily.co/mediconnect-consult-post-1",
    accessToken: "jwt_token_123",
    participantRole: "PATIENT",
    participantName: "Tariqul Islam",
    doctorName: "Dr. Mahmudur Rahman",
    patientName: "Tariqul Islam",
    scheduledStartAt: "2026-11-01T14:00:00.000Z",
    scheduledEndAt: "2026-11-01T14:30:00.000Z",
    opensAt: "2026-11-01T13:55:00.000Z",
    closesAt: "2026-11-01T14:30:00.000Z",
  };

  const dummyDoctorSession: VideoSession = {
    ...dummyPatientSession,
    participantRole: "DOCTOR",
    participantName: "Dr. Mahmudur Rahman",
  };

  it("renders patient post-consultation view with ratings and follow-up booking", () => {
    const html = renderToString(
      <MemoryRouter>
        <PostConsultationSummary
          session={dummyPatientSession}
          appointmentId="appt-post-1"
          consultationDurationMinutes={18}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Consultation Concluded");
    expect(html).toContain("Daily.co WebRTC HD Completed");
    expect(html).toContain("Duration: ~18 Minutes");
    expect(html).toContain("Dr. Mahmudur Rahman");
    expect(html).toContain("Tariqul Islam");
    expect(html).toContain("Rate Your Consultation Experience");
    expect(html).toContain("Clear explanation");
    expect(html).toContain("Book Follow-up Appointment");
    expect(html).toContain("Return to Appointments");
  });

  it("renders doctor post-consultation view with clinical notes and issue prescription action", () => {
    const html = renderToString(
      <MemoryRouter>
        <PostConsultationSummary
          session={dummyDoctorSession}
          appointmentId="appt-post-1"
          consultNotes="Patient presented with dry cough and mild fever. Prescribed Paracetamol."
          onClose={vi.fn()}
          onIssuePrescription={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Consultation Concluded");
    expect(html).toContain("In-Call Clinical Scratchpad Notes");
    expect(html).toContain("Patient presented with dry cough");
    expect(html).toContain("Issue E-Prescription");
    expect(html).toContain("Copy Notes");
    expect(html).toContain("Back to Clinical Queue");
  });
});
