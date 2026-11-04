import { useState } from "react";
import { appointmentsApi } from "../../../api/appointments";
import { Alert, Button } from "../../../shared/ui";
import type { DoctorAppointment } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";
import { patientIdentity } from "./patientFocus.model";
import styles from "./PatientFocus.module.css";

const labels = { complete: "Mark completed", cancel: "Cancel appointment", "no-show": "Mark no-show" };
export function AppointmentActionPanel({ appointment, action, onSaved, onBack, onBusyChange }: {
  appointment: DoctorAppointment; action: keyof typeof labels;
  onSaved: () => Promise<void>; onBack: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  async function confirm() {
    if (busy) return;
    setBusy(true); onBusyChange(true); setError(null);
    try {
      if (action === "complete") await appointmentsApi.completeAppointment(appointment.id);
      if (action === "no-show") await appointmentsApi.markNoShow(appointment.id);
      if (action === "cancel") await appointmentsApi.cancelAppointment(appointment.id, reason.trim());
      await onSaved();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not update this appointment. Please retry."));
    } finally { setBusy(false); onBusyChange(false); }
  }
  return <div className={styles.stack}>
    <h3>{labels[action]}?</h3><p>{patientIdentity(appointment).name}</p>
    <p>{action === "complete" ? "Confirm that this consultation has finished. This changes the appointment to completed."
      : action === "cancel" ? "This cancels the appointment. The server applies the applicable cancellation and refund policy."
      : "Confirm that this patient did not attend their appointment."}</p>
    {action === "cancel" && <label className={styles.stack}>Reason (optional)
      <textarea aria-label="Cancellation reason" value={reason} maxLength={500} disabled={busy}
        onChange={(event) => setReason(event.target.value)} rows={3} />
    </label>}
    {error && <Alert kind="error">{error}</Alert>}
    <div className={styles.actions}>
      <Button size="sm" variant="secondary" disabled={busy} onClick={onBack}>Go back</Button>
      <Button size="sm" variant={action === "cancel" ? "danger" : "primary"} loading={busy} onClick={() => void confirm()}>Confirm: {labels[action]}</Button>
    </div>
  </div>;
}
