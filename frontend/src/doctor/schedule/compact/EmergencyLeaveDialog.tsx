import { useState } from "react";
import { Alert, Button, Dialog, DialogContent, Field, FormField, Select } from "../../../shared/ui";
import type { AddTimeOffFormValues } from "../types/doctorSchedule.types";
import { emergencyLeaveValues } from "./scheduleView.model";
import styles from "./ScheduleView.module.css";

export function EmergencyLeaveDialog({ busy, serverError, onSave, onClose }: {
  busy: boolean; serverError: string | null;
  onSave: (values: AddTimeOffFormValues) => Promise<boolean>; onClose: () => void;
}) {
  const [preset, setPreset] = useState<"today" | "two-hours" | "tomorrow">("today");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setAttempted(true);
    if (busy) return;
    if (reason.length > 300) { setError("Keep the reason within 300 characters."); return; }
    try {
      const values = emergencyLeaveValues(preset, new Date(), reason.trim());
      if (await onSave(values)) onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save emergency leave."); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent title="Emergency leave" description="Block new bookings in Dhaka time.">
      <form className={styles.stack} onSubmit={submit}>
        <FormField label="Period"><Select disabled={busy} value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}>
          <option value="today">Rest of today</option><option value="two-hours">Next 2 hours (today only)</option><option value="tomorrow">Tomorrow, all day</option>
        </Select></FormField>
        <Field label="Reason (optional)" value={reason} onChange={setReason} disabled={busy} />
        <p className={styles.muted}>Existing appointments remain booked. Coordinate changes from Appointments.</p>
        {(error || attempted && serverError) && <Alert kind="error">{error || serverError}</Alert>}
        <div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={busy}>Confirm leave</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
