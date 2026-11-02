import { AlertTriangle } from "lucide-react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";
import type { ScheduleRuleItem } from "../../types/doctorSchedule.types";

interface DeleteRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ScheduleRuleItem | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting?: boolean;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function DeleteRuleDialog({
  open,
  onOpenChange,
  rule,
  onConfirmDelete,
  isDeleting = false,
}: DeleteRuleDialogProps) {
  if (!rule) return null;

  const dayName = WEEKDAYS[rule.dayOfWeek] ?? "Day";
  const start = rule.startTime.slice(0, 5);
  const end = rule.endTime.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Remove Working Hours"
        description="Please confirm removal of this recurring consultation period."
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={isDeleting}
              onClick={async () => {
                await onConfirmDelete();
                onOpenChange(false);
              }}
            >
              Remove Hours
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Alert kind="warning">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
              <div>
                <strong>Notice:</strong> Removing recurring hours for{" "}
                <strong>{dayName} ({start} – {end})</strong> will update your weekly availability.
                Future slots in this period will not be generated.
              </div>
            </div>
          </Alert>

          <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Existing confirmed patient appointments on your queue are preserved and are not
            automatically cancelled or rescheduled. If you need to cancel already-booked consultations,
            please coordinate via your Appointment Queue.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
