import { Alert, Button, Dialog, DialogContent } from "../../../shared/ui";
import styles from "./ProfileWorkspace.module.css";

export function ProfileConfirmation({ title, description, confirmLabel, busy = false, error, onConfirm, onClose }: {
  title: string; description: string; confirmLabel: string; busy?: boolean; error?: string | null;
  onConfirm: () => void; onClose: () => void;
}) {
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent title={title} description={description}>
      <div className={styles.stack}>
        {error && <Alert kind="error">{error}</Alert>}
        <div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>{confirmLabel}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
