import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, Button, Dialog, DialogContent, Field } from "../../../../shared/ui";
import type { AddTimeOffFormValues } from "../../types/doctorSchedule.types";

interface AddTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: AddTimeOffFormValues) => Promise<boolean>;
  isSaving?: boolean;
}

export function AddTimeOffDialog({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: AddTimeOffDialogProps) {
  const [date, setDate] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Today in Dhaka as min date
  const todayDhaka = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

  useEffect(() => {
    if (open) {
      setError(null);
      setDate(todayDhaka);
      setIsFullDay(true);
      setStartTime("09:00");
      setEndTime("17:00");
      setReason("");
    }
  }, [open, todayDhaka]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("Please select a date for time off.");
      return;
    }

    if (date < todayDhaka) {
      setError("Time-off date cannot be in the past.");
      return;
    }

    if (!isFullDay && startTime >= endTime) {
      setError("Start time must be earlier than end time.");
      return;
    }

    const success = await onSave({
      date,
      isFullDay,
      startTime,
      endTime,
      reason,
    });

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Schedule Leave / Blockout"
        description="Block consultation availability for a specific day or time period."
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" loading={isSaving} onClick={handleSubmit}>
              Block Period
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert kind="error">{error}</Alert>}

          <Field
            label="Leave Date"
            value={date}
            onChange={setDate}
            type="date"
            required
            hint="Dhaka calendar date between today and one year ahead."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <input
              id="full-day-checkbox"
              type="checkbox"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              style={{ cursor: "pointer", width: 16, height: 16 }}
            />
            <label htmlFor="full-day-checkbox" style={{ fontSize: "var(--font-size-sm)", cursor: "pointer", fontWeight: 500 }}>
              Block Entire Day (24 Hours)
            </label>
          </div>

          {!isFullDay && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Field
                label="Start Time (HH:mm)"
                value={startTime}
                onChange={setStartTime}
                type="time"
                required
                hint="Start of blackout window"
              />
              <Field
                label="End Time (HH:mm)"
                value={endTime}
                onChange={setEndTime}
                type="time"
                required
                hint="End of blackout window"
              />
            </div>
          )}

          <Field
            label="Reason (Optional)"
            value={reason}
            onChange={setReason}
            placeholder="e.g. Hospital emergency duty, medical conference, or personal leave"
            hint="Internal note recorded on your leave calendar (max 300 chars)."
          />

          <Alert kind="warning">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
              <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "var(--font-size-xs)", lineHeight: 1.4 }}>
                <strong>Important:</strong> Blocking this date prevents new appointments from being
                booked. If you already have confirmed appointments scheduled during this window, they
                remain on your queue and must be coordinated separately.
              </div>
            </div>
          </Alert>
        </form>
      </DialogContent>
    </Dialog>
  );
}
