import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "../../../shared/ui";
import type { TimeOffItem } from "../types/doctorSchedule.types";
import styles from "./ScheduleView.module.css";

export function LeaveDrawer({ entries, onClose, onAdd, onRemove, busy }: {
  entries: TimeOffItem[]; onClose: () => void; onAdd: () => void;
  onRemove: (entry: TimeOffItem) => void; busy: boolean;
}) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.drawer}
      onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById("schedule-page-title")?.focus(); }}>
      <div className={styles.drawerTop}><div><Dialog.Title>Leave</Dialog.Title>
        <Dialog.Description className={styles.muted}>Dates and times you are unavailable.</Dialog.Description></div>
        <Dialog.Close disabled={busy} className={styles.close} aria-label="Close leave panel"><X size={18} /></Dialog.Close>
      </div>
      <div className={styles.stack}>
        <Button size="sm" disabled={busy} onClick={onAdd}>Add leave</Button>
        {!entries.length ? <p className={styles.muted}>No leave scheduled.</p> :
          [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((entry) =>
            <div className={styles.leaveRow} key={entry.id}>
              <div><strong>{entry.date}</strong><p className={styles.muted}>
                {!entry.startTime && !entry.endTime ? "All day" : `${entry.startTime?.slice(0, 5)}–${entry.endTime?.slice(0, 5)}`}</p>
                {entry.reason && <p className={styles.reason}>{entry.reason}</p>}</div>
              <Button variant="ghost" size="sm" disabled={busy} aria-label={`Remove leave on ${entry.date}`} onClick={() => onRemove(entry)}>Remove</Button>
            </div>)}
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
