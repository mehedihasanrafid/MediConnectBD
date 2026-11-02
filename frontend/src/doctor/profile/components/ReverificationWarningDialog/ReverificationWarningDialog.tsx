import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";

interface ReverificationWarningDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ReverificationWarningDialog({
  open,
  onConfirm,
  onCancel,
  isSaving = false,
}: ReverificationWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onCancel() : undefined)}>
      <DialogContent
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <ShieldAlert size={20} style={{ color: "var(--amber-600)" }} aria-hidden="true" />
            <span>Profile Update Requires Re-Verification</span>
          </div>
        }
        description="Important notice regarding your active directory status."
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" variant="primary" loading={isSaving} onClick={onConfirm}>
              Continue &amp; Save
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Alert kind="warning">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
              <div>
                <strong>Application Status Transition:</strong> Updating your profile will return your
                application to <strong>Draft</strong> status. Your public listing and booking availability
                may become unavailable until an administrator approves your updated profile.
              </div>
            </div>
          </Alert>

          <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Because professional credentials, clinical specialties, and chambers represent verified
            medical data presented to patients, changes must undergo administrative review before
            they are published.
          </p>

          <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontWeight: 500 }}>
            Do you wish to apply your changes and return your status to Draft?
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
