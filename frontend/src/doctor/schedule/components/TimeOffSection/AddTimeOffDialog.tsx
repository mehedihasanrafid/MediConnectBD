import { useState } from "react";
import { Alert, Button, Dialog, DialogContent, Field } from "../../../../shared/ui";
import type { AddTimeOffFormValues } from "../../types/doctorSchedule.types";
import styles from "../../compact/ScheduleView.module.css";

interface AddTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: AddTimeOffFormValues) => Promise<boolean>;
  isSaving?: boolean;
  serverError?: string | null;
}

const todayInDhaka = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
export function AddTimeOffDialog(props: AddTimeOffDialogProps) {
  return props.open ? <LeaveForm {...props} /> : null;
}

function LeaveForm({ open, onOpenChange, onSave, isSaving = false, serverError }: AddTimeOffDialogProps) {
  const [values, setValues] = useState<AddTimeOffFormValues>(() => ({
    date: todayInDhaka(), isFullDay: true, startTime: "09:00", endTime: "17:00", reason: "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const update = (patch: Partial<AddTimeOffFormValues>) => setValues((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setAttempted(true);
    if (isSaving) return;
    if (!values.date || values.date < todayInDhaka()) { setError("Choose today or a future date."); return; }
    if (!values.isFullDay && values.startTime >= values.endTime) { setError("Start must be earlier than end."); return; }
    if (values.reason.length > 300) { setError("Keep the reason within 300 characters."); return; }
    try { if (await onSave(values)) onOpenChange(false); }
    catch { setError("Could not save leave. Please try again."); }
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!isSaving) onOpenChange(next); }}>
    <DialogContent title="Add leave" description="Block new bookings · Dhaka (UTC+6)"
      footer={<div className={styles.actions}>
        <Button variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" form="add-leave-form" loading={isSaving}>Save leave</Button>
      </div>}>
      <form id="add-leave-form" className={styles.stack} onSubmit={submit}>
        {(error || attempted && serverError) && <Alert kind="error">{error || serverError}</Alert>}
        <Field label="Date" type="date" value={values.date} onChange={(date) => update({ date })} required disabled={isSaving} />
        <label><input type="checkbox" checked={values.isFullDay} disabled={isSaving}
          onChange={(event) => update({ isFullDay: event.target.checked })} /> All day</label>
        {!values.isFullDay && <div className={styles.fields}>
          <Field label="Start" type="time" value={values.startTime} onChange={(startTime) => update({ startTime })} required disabled={isSaving} />
          <Field label="End" type="time" value={values.endTime} onChange={(endTime) => update({ endTime })} required disabled={isSaving} />
        </div>}
        <Field label="Reason (optional)" value={values.reason} onChange={(reason) => update({ reason })} disabled={isSaving} />
        <p className={styles.muted}>Existing appointments remain booked. Coordinate changes from Appointments.</p>
      </form>
    </DialogContent>
  </Dialog>;
}
