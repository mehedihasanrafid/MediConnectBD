import { useState } from "react";
import { Alert, Button, Dialog, DialogContent } from "../../../shared/ui";
import type { TimeOffItem } from "../types/doctorSchedule.types";
import styles from "./ScheduleView.module.css";

export function RemoveLeaveDialog({ entry, busy, serverError, onRemove, onClose }: {
  entry: TimeOffItem; busy: boolean; serverError: string | null;
  onRemove: () => Promise<boolean>; onClose: () => void;
}) {
  const [attempted, setAttempted] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent title="Remove leave?" description={`${entry.date} · ${entry.startTime ? `${entry.startTime.slice(0, 5)}–${entry.endTime?.slice(0, 5)}` : "All day"}`}>
      <div className={styles.stack}>
        <p>This removes the block. Your weekly working hours will apply again.</p>
        {attempted && serverError && <Alert kind="error">{serverError}</Alert>}
        <div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={onClose}>Keep leave</Button>
          <Button variant="danger" loading={busy} onClick={async () => {
            setAttempted(true); if (await onRemove()) onClose();
          }}>Remove leave</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
