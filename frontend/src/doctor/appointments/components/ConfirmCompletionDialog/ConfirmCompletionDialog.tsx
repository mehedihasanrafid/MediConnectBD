import { useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";
import type { DoctorAppointment } from "../../../../shared/types";
import { formatDhakaDateTime } from "../../../../shared/utils/format";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import styles from "./ConfirmCompletionDialog.module.css";

interface ConfirmCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: DoctorAppointment | null;
  onConfirmComplete: (appointmentId: string) => Promise<boolean | void>;
}

export function ConfirmCompletionDialog({
  open,
  onOpenChange,
  appointment,
  onConfirmComplete,
}: ConfirmCompletionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return null;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : "Patient Visit";

  const handleConfirm = async () => {
    if (!appointment || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmComplete(appointment.id);
      onOpenChange(false);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not mark consultation as completed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent
        title="Complete Clinical Consultation"
        description="Formally conclude and document the encounter for this patient."
        footer={
          <div className={styles.footer}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={handleConfirm}
            >
              <CheckCircle2 size={16} aria-hidden="true" style={{ marginRight: "4px" }} />
              <span>Confirm &amp; Complete Consultation</span>
            </Button>
          </div>
        }
      >
        <div className={styles.container}>
          <div className={styles.metaCard}>
            <span className={styles.metaTitle}>{patientName}</span>
            <span className={styles.metaSub}>
              {formatDhakaDateTime(appointment.scheduledStartAt)} · {appointment.mode === "VIDEO" ? "Telehealth Video" : "In-Person Chamber"} Consultation
            </span>
          </div>

          {error && <Alert kind="error">{error}</Alert>}

          <Alert kind="info">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
              <div>
                <strong>Clinical Encounter Finalization:</strong>
                <p style={{ margin: "4px 0 0" }}>
                  Completing this encounter formally closes the active consultation and updates the status to <strong>COMPLETED</strong>. This unlocks official prescription issuance and patient review.
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "0.6875rem", color: "var(--color-text-secondary)" }}>
                  * Prescriptions are optional. You may complete this consultation now even if no medication is prescribed (e.g. advice or diagnostic investigations only).
                </p>
              </div>
            </div>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
