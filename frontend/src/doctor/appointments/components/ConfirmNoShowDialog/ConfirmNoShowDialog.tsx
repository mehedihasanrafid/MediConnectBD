import { UserX } from "lucide-react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";
import type { DoctorAppointment } from "../../../../shared/types";
import { formatDhakaDateTime } from "../../../../shared/utils/format";
import styles from "./ConfirmNoShowDialog.module.css";

interface ConfirmNoShowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: DoctorAppointment | null;
  onConfirmNoShow: (appointmentId: string) => Promise<void>;
  isUpdating?: boolean;
}

export function ConfirmNoShowDialog({
  open,
  onOpenChange,
  appointment,
  onConfirmNoShow,
  isUpdating = false,
}: ConfirmNoShowDialogProps) {
  if (!appointment) return null;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : "Patient Visit";

  const handleConfirm = async () => {
    await onConfirmNoShow(appointment.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Record Patient No-Show"
        description="Record that the patient did not attend this scheduled consultation session."
        footer={
          <div className={styles.footer}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={isUpdating}
              onClick={handleConfirm}
            >
              Confirm Patient No-Show
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

          <Alert kind="info">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <UserX size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
              <div>
                <strong>Attendance Audit Trail:</strong> Marking this consultation as a No-Show records the attendance status and closes the active slot. This action cannot be reversed.
              </div>
            </div>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
