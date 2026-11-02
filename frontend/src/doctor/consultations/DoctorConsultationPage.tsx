import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import {
  AlertTriangle,
  Clock,
  FileText,
  RotateCcw,
  Stethoscope,
  Video,
} from "lucide-react";

import { Alert, Button, Page, Spinner, useToast } from "../../shared/ui";
import { formatDhakaDateTime } from "../../shared/utils/format";
import { playChimeSound } from "../../shared/utils/sound";
import { VideoSessionPanel } from "../../patient/appointments/components/VideoSessionPanel";
import { ContextualPatientDrawer } from "../dashboard/components/ContextualPatientDrawer";
import { IssuePrescriptionModal } from "../dashboard/components/IssuePrescriptionModal";
import { ConfirmCompletionDialog } from "../appointments/components/ConfirmCompletionDialog";
import { ChamberDeskView } from "./components/ChamberDeskView";
import { ClinicalNotesPanel } from "./components/ClinicalNotesPanel";
import { ConsultationHeader } from "./components/ConsultationHeader";
import { useDoctorConsultation } from "./hooks/useDoctorConsultation";
import styles from "./DoctorConsultationPage.module.css";

export function DoctorConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    appointment,
    loading,
    error,
    videoSession,
    videoStatus,
    videoError,
    existingPrescription,
    clinicalNotes,
    vitals,
    busy,
    updateClinicalNotes,
    updateVitals,
    applyFastRxBundle,
    completeConsultation,
    registerIssuedPrescription,
    reload,
  } = useDoctorConsultation(appointmentId);

  // Responsive mobile active view: "SESSION" vs "NOTES"
  const [mobileTab, setMobileTab] = useState<"SESSION" | "NOTES">("SESSION");

  // Drawers and Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  if (loading) {
    return (
      <Page>
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-12) 0" }}>
          <Spinner label="Loading clinical consultation encounter…" />
        </div>
      </Page>
    );
  }

  if (error || !appointment) {
    return (
      <Page>
        <div className={styles.container}>
          <Alert kind="error">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <span>{error || "Consultation appointment not found."}</span>
              <div>
                <Button variant="secondary" onClick={() => navigate("/doctor/appointments")}>
                  Return to Appointment Queue
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      </Page>
    );
  }

  const isVideo = appointment.mode === "VIDEO";
  const isCompleted = appointment.status === "COMPLETED";

  const handleComplete = async () => {
    const success = await completeConsultation();
    if (success) {
      playChimeSound("complete");
      showToast("Consultation marked as completed! You can now author and issue the prescription.", {
        kind: "success",
      });
    } else {
      throw new Error("Could not mark consultation as completed.");
    }
    return success;
  };

  return (
    <Page>
      <div className={styles.container}>
        {/* 1. Clinical Context Header */}
        <ConsultationHeader appointment={appointment} />

        {/* 2. Responsive Mobile Tab Selector (shown only on small screens) */}
        <div className={styles.mobileTabToggle}>
          <button
            type="button"
            className={clsx(styles.mobileTabBtn, mobileTab === "SESSION" && styles.mobileTabBtnActive)}
            onClick={() => setMobileTab("SESSION")}
          >
            {isVideo ? <Video size={13} aria-hidden="true" /> : <Stethoscope size={13} aria-hidden="true" />}
            <span>{isVideo ? "Telehealth Call" : "Chamber Intake"}</span>
          </button>
          <button
            type="button"
            className={clsx(styles.mobileTabBtn, mobileTab === "NOTES" && styles.mobileTabBtnActive)}
            onClick={() => setMobileTab("NOTES")}
          >
            <FileText size={13} aria-hidden="true" />
            <span>Clinical Notes</span>
          </button>
        </div>

        {/* 3. Main Workspace Grid */}
        <div className={styles.workspaceGrid}>
          {/* Left Wing: Telehealth Video Room or In-Person Chamber Desk */}
          <div
            className={styles.videoWing}
            style={{ display: mobileTab === "SESSION" ? "flex" : undefined }}
          >
            {isVideo ? (
              videoStatus === "ELIGIBLE" && videoSession ? (
                <VideoSessionPanel
                  appointmentId={appointment.id}
                  initialSession={videoSession}
                  skipLobby={false}
                  onClose={() => navigate("/doctor/appointments")}
                />
              ) : videoStatus === "TOO_EARLY" ? (
                <div className={styles.waitingCard}>
                  <Clock size={36} className={styles.waitingIcon} aria-hidden="true" />
                  <h2 className={styles.waitingTitle}>Telehealth Session Not Yet Active</h2>
                  <p className={styles.waitingText}>
                    {videoError ||
                      "Under MediConnectBD clinical security policy, the WebRTC room opens exactly 5 minutes before scheduled start time."}
                  </p>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    Scheduled Start: <strong>{formatDhakaDateTime(appointment.scheduledStartAt)}</strong>
                  </div>
                  <button type="button" className={styles.refreshBtn} onClick={() => reload()}>
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>Check Room Status</span>
                  </button>
                </div>
              ) : (
                <div className={styles.waitingCard}>
                  <AlertTriangle size={36} style={{ color: "var(--color-warning)" }} aria-hidden="true" />
                  <h2 className={styles.waitingTitle}>Telehealth Session Inactive</h2>
                  <p className={styles.waitingText}>
                    {videoError ||
                      `This consultation cannot be entered in video mode while appointment status is ${appointment.status}.`}
                  </p>
                  <Button variant="secondary" onClick={() => navigate("/doctor/appointments")}>
                    Back to Queue
                  </Button>
                </div>
              )
            ) : (
              /* In-Person Chamber Desk View */
              <ChamberDeskView
                appointment={appointment}
                vitals={vitals}
                onUpdateVital={updateVitals}
              />
            )}
          </div>

          {/* Right Wing: Clinical Documentation Panel */}
          <div style={{ display: mobileTab === "NOTES" ? "block" : undefined }}>
            <ClinicalNotesPanel
              notes={clinicalNotes}
              onUpdateNote={updateClinicalNotes}
              onApplyFastRx={applyFastRxBundle}
              onOpenHistory={() => setIsHistoryOpen(true)}
              onOpenPrescription={() => setIsPrescriptionModalOpen(true)}
              onCompleteConsultation={() => {
                setShowCompleteConfirm(true);
                return Promise.resolve(false);
              }}
              isCompleted={isCompleted}
              existingPrescription={existingPrescription}
              busy={busy}
            />
          </div>
        </div>

        {/* 4. Authorized Patient Clinical History Drawer */}
        <ContextualPatientDrawer
          patientProfileId={isHistoryOpen ? appointment.patientProfileId : null}
          onClose={() => setIsHistoryOpen(false)}
        />

        {/* 5. Digital Prescription Builder Modal */}
        <IssuePrescriptionModal
          appointment={isPrescriptionModalOpen ? appointment : null}
          isOpen={isPrescriptionModalOpen}
          onClose={() => setIsPrescriptionModalOpen(false)}
          onPrescriptionIssued={(rx) => {
            registerIssuedPrescription(rx);
            setIsPrescriptionModalOpen(false);
          }}
          onAppointmentCompleted={() => {
            void reload();
          }}
          initialBundle={
            clinicalNotes.diagnosis
              ? {
                  id: "encounter-notes",
                  title: "Encounter Clinical Notes",
                  category: "Encounter",
                  diagnosis: clinicalNotes.diagnosis,
                  medicines: clinicalNotes.medicines.map((m) => ({
                    name: m.name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    duration: m.duration,
                    instruction: "",
                  })),
                  tests: clinicalNotes.tests,
                  advice: clinicalNotes.advice,
                }
              : null
          }
        />

        {/* 6. Explicit Consultation Completion Confirmation Dialog */}
        <ConfirmCompletionDialog
          open={showCompleteConfirm}
          onOpenChange={setShowCompleteConfirm}
          appointment={appointment}
          onConfirmComplete={handleComplete}
        />
      </div>
    </Page>
  );
}
