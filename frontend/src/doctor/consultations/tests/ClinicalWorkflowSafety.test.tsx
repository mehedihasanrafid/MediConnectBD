import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { IssuePrescriptionModal } from "../../dashboard/components/IssuePrescriptionModal";
import { ConfirmCompletionDialog } from "../../appointments/components/ConfirmCompletionDialog";
import { ClinicalNotesPanel } from "../components/ClinicalNotesPanel";
import { FAST_RX_PRESET_BUNDLES } from "../../dashboard/data/fastRxPresets";
import { appointmentsApi } from "../../../api/appointments";
import type { DoctorAppointment } from "../../../shared/types";

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open !== false ? <div>{children}</div> : null,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Overlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div role="dialog" className={className}>{children}</div>
  ),
  Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  Description: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
  Close: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button type="button" className={className}>{children}</button>
  ),
  Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../api/appointments", () => ({
  appointmentsApi: {
    completeAppointment: vi.fn(),
  },
}));

vi.mock("../../../api/prescriptions", () => ({
  prescriptionsApi: {
    create: vi.fn(),
  },
}));

const dummyConfirmedAppt = {
  id: "appt-confirmed-1",
  patientProfileId: "patient-1",
  doctorId: "doc-1",
  scheduledStartAt: "2026-11-05T10:00:00Z",
  scheduledEndAt: "2026-11-05T10:20:00Z",
  mode: "VIDEO",
  status: "CONFIRMED",
  feeAmount: 1200,
  patient: {
    id: "p-1",
    userId: "u-1",
    firstName: "Abdur",
    lastName: "Rahim",
    phone: "+8801711000000",
    email: "rahim@example.com",
    gender: "MALE",
    dateOfBirth: "1990-01-01",
  },
} as DoctorAppointment;

const dummyCompletedAppt: DoctorAppointment = {
  ...dummyConfirmedAppt,
  id: "appt-completed-2",
  status: "COMPLETED",
};

describe("Phase 5.1 Clinical Workflow Safety & Verification", () => {
  it("1. Opening prescription form never completes appointments", () => {
    vi.mocked(appointmentsApi.completeAppointment).mockClear();

    const html = renderToString(
      <IssuePrescriptionModal
        appointment={dummyConfirmedAppt}
        isOpen={true}
        onClose={vi.fn()}
        onPrescriptionIssued={vi.fn()}
      />,
    );

    // Backend completion was never called
    expect(appointmentsApi.completeAppointment).not.toHaveBeenCalled();

    // Renders warning that consultation must be completed before issuing
    expect(html).toContain("Complete the consultation before issuing a prescription.");
    expect(html).toContain("Complete Consultation Encounter…");
  });

  it("2. Applying a FastRx preset never completes appointments", () => {
    vi.mocked(appointmentsApi.completeAppointment).mockClear();

    const html = renderToString(
      <IssuePrescriptionModal
        appointment={dummyConfirmedAppt}
        isOpen={true}
        initialBundle={FAST_RX_PRESET_BUNDLES[0]}
        onClose={vi.fn()}
        onPrescriptionIssued={vi.fn()}
      />,
    );

    expect(appointmentsApi.completeAppointment).not.toHaveBeenCalled();
    expect(html).toContain(FAST_RX_PRESET_BUNDLES[0].diagnosis);
    expect(html).toContain("Complete the consultation before issuing a prescription.");
  });

  it("3. Previewing a prescription never completes appointments", () => {
    vi.mocked(appointmentsApi.completeAppointment).mockClear();

    const html = renderToString(
      <IssuePrescriptionModal
        appointment={dummyConfirmedAppt}
        isOpen={true}
        onClose={vi.fn()}
        onPrescriptionIssued={vi.fn()}
      />,
    );

    expect(appointmentsApi.completeAppointment).not.toHaveBeenCalled();
    expect(html).toContain("Document Preview");
  });

  it("4. Explicit doctor confirmation is required for completion (ConfirmCompletionDialog)", () => {
    const html = renderToString(
      <ConfirmCompletionDialog
        open={true}
        onOpenChange={vi.fn()}
        appointment={dummyConfirmedAppt}
        onConfirmComplete={vi.fn()}
      />,
    );

    expect(html).toContain("Complete Clinical Consultation");
    expect(html).toContain("Formally conclude and document the encounter for this patient.");
    expect(html).toContain("Abdur Rahim");
    expect(html).toContain("Confirm &amp; Complete Consultation");
    expect(html).toContain("Prescriptions are optional");
  });

  it("5. Prescription creation respects backend completion requirements (disabled when not completed)", () => {
    const confirmedHtml = renderToString(
      <IssuePrescriptionModal
        appointment={dummyConfirmedAppt}
        isOpen={true}
        onClose={vi.fn()}
        onPrescriptionIssued={vi.fn()}
      />,
    );

    // When CONFIRMED: button is disabled
    expect(confirmedHtml).toContain('disabled=""');
    expect(confirmedHtml).toContain("Complete the consultation before issuing a prescription.");

    const completedHtml = renderToString(
      <IssuePrescriptionModal
        appointment={dummyCompletedAppt}
        isOpen={true}
        onClose={vi.fn()}
        onPrescriptionIssued={vi.fn()}
      />,
    );

    // When COMPLETED: warning banner is absent
    expect(completedHtml).not.toContain("Complete the consultation before issuing a prescription.");
  });

  it("6. Unsupported EHR persistence is never represented as successful (In-Memory Scratchpad)", () => {
    const html = renderToString(
      <ClinicalNotesPanel
        notes={{
          chiefComplaint: "Fever and cough",
          clinicalFindings: "Chest clear",
          diagnosis: "Viral Pharyngitis",
          medicines: [],
          tests: [],
          advice: "Warm fluids",
        }}
        onUpdateNote={vi.fn()}
        onApplyFastRx={vi.fn()}
        onOpenHistory={vi.fn()}
        onOpenPrescription={vi.fn()}
        onCompleteConsultation={vi.fn().mockResolvedValue(true)}
        isCompleted={false}
        existingPrescription={null}
        busy={false}
      />,
    );

    // Clearly labeled as unsaved in-memory scratchpad
    expect(html).toContain("In-Memory Scratchpad (Unsaved)");
    expect(html).toContain("In-Memory Clinical Scratchpad:");
    expect(html).toContain("maintained in-memory for this active session only");
    expect(html).not.toContain("Saved to EHR");
    expect(html).not.toContain("Persisted to official EHR records");
  });

  it("7. Verification labels match implemented capabilities (No false cryptographic signing claims)", () => {
    const html = renderToString(
      <IssuePrescriptionModal
        appointment={dummyCompletedAppt}
        isOpen={true}
        onClose={vi.fn()}
        onPrescriptionIssued={vi.fn()}
      />,
    );

    // Truthful capabilities: verification code and QR lookup
    expect(html).toContain("Official prescription with doctor BMDC seal / registration number, unique verification code and QR lookup link.");
    // No false claims of encryption or digital cryptographic signatures
    expect(html).not.toContain("encrypted verification code");
    expect(html).not.toContain("cryptographic digital signature");
    expect(html).not.toContain("BMDC seal validation");
  });
});
