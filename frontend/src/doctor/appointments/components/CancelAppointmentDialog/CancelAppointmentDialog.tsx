import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";
import type { DoctorAppointment } from "../../../../shared/types";
import { formatDhakaDateTime } from "../../../../shared/utils/format";
import styles from "./CancelAppointmentDialog.module.css";

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: DoctorAppointment | null;
  onConfirmCancel: (appointmentId: string, reason: string) => Promise<void>;
  isCancelling?: boolean;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onConfirmCancel,
  isCancelling = false,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState("");

  if (!appointment) return null;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : "Patient Visit";

  const handleConfirm = async () => {
    await onConfirmCancel(appointment.id, reason.trim());
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isCancelling) {
          setReason("");
          onOpenChange(next);
        }
      }}
    >
      <DialogContent
        title="Cancel Patient Consultation"
        description="Please confirm cancellation and state a reason for clinical audit and patient communication."
        footer={
          <div className={styles.footer}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isCancelling}
            >
              Keep Consultation
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={isCancelling}
              onClick={handleConfirm}
            >
              Confirm Cancellation
            </Button>
          </div>
        }
      >
        <div className={styles.container}>
          <div className={styles.metaCard}>
            <span className={styles.metaTitle}>{patientName}</span>
            <span className={styles.metaSub}>
              {formatDhakaDateTime(appointment.scheduledStartAt)} · {appointment.mode} Consultation
            </span>
          </div>

          <Alert kind="warning">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
              <div>
                <strong>Cancellation &amp; Refund Notice:</strong> If this appointment was paid by the patient, a 100% refund will be automatically initiated to their payment account. The patient will be notified immediately.
              </div>
            </div>
          </Alert>

          <div className={styles.fieldGroup}>
            <label htmlFor="cancel-reason" className={styles.label}>
              Reason for Cancellation (Optional)
            </label>
            <textarea
              id="cancel-reason"
              className={styles.textarea}
              placeholder="e.g., Clinical emergency, physician schedule conflict…"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isCancelling}
            />
            <span className={styles.charCount}>{reason.length}/500</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
