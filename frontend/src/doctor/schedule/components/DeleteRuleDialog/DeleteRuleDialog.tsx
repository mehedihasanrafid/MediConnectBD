import { useState } from "react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";
import type { ScheduleRuleItem } from "../../types/doctorSchedule.types";
import { scheduleDays } from "../../compact/scheduleView.model";
import styles from "../../compact/ScheduleView.module.css";

interface DeleteRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ScheduleRuleItem | null;
  onConfirmDelete: () => Promise<boolean>;
  isDeleting?: boolean;
  serverError?: string | null;
}

export function DeleteRuleDialog({ open, onOpenChange, rule, onConfirmDelete,
  isDeleting = false, serverError }: DeleteRuleDialogProps) {
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!rule) return null;
  async function remove() {
    if (isDeleting) return;
    setAttempted(true); setError(null);
    try { if (await onConfirmDelete()) onOpenChange(false); }
    catch { setError("Could not remove hours. Please try again."); }
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!isDeleting) onOpenChange(next); }}>
    <DialogContent title="Remove hours?"
      description={`${scheduleDays[rule.dayOfWeek]} · ${rule.startTime.slice(0, 5)}–${rule.endTime.slice(0, 5)}`}>
      <div className={styles.stack}>
        <p>Future slots will no longer be generated for these hours. Existing appointments remain booked.</p>
        {(error || attempted && serverError) && <Alert kind="error">{error || serverError}</Alert>}
        <div className={styles.actions}>
          <Button variant="secondary" disabled={isDeleting} onClick={() => onOpenChange(false)}>Keep hours</Button>
          <Button variant="danger" loading={isDeleting} onClick={() => void remove()}>Remove hours</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
