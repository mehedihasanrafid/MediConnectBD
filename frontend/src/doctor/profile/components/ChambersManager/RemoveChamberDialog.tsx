import { AlertTriangle } from "lucide-react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";
import type { DoctorChamberDetail } from "../../types/doctorProfile.types";

interface RemoveChamberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamber: DoctorChamberDetail | null;
  onConfirmRemove: () => Promise<void>;
  isRemoving?: boolean;
}

export function RemoveChamberDialog({
  open,
  onOpenChange,
  chamber,
  onConfirmRemove,
  isRemoving = false,
}: RemoveChamberDialogProps) {
  if (!chamber) return null;

  const hospitalName = chamber.hospital?.name ?? "this hospital";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Remove Practicing Chamber"
        description="Please confirm removal of this practicing chamber location."
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={isRemoving}
              onClick={async () => {
                await onConfirmRemove();
                onOpenChange(false);
              }}
            >
              Remove Chamber
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Alert kind="warning">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
              <div>
                <strong>Warning:</strong> Removing your chamber at <strong>{hospitalName}</strong> will
                deactivate future scheduling for this chamber. Any associated weekly availability
                rules will no longer generate slots.
              </div>
            </div>
          </Alert>

          <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Are you sure you wish to proceed? If your profile is currently approved, updating your
            registered chambers will also require administrator re-verification before your profile
            becomes active for patient bookings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
