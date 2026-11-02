import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, Video } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  Field,
  FormField,
  Select,
} from "../../../../shared/ui";
import { formatMoney } from "../../../../shared/utils/format";
import type { DoctorChamberDetail } from "../../../profile/types/doctorProfile.types";
import type { ScheduleRuleItem, WorkingHoursFormValues } from "../../types/doctorSchedule.types";

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface WorkingHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeChambers: DoctorChamberDetail[];
  videoConsultationFee: number | null;
  editingRule?: ScheduleRuleItem | null;
  onSave: (values: WorkingHoursFormValues) => Promise<boolean>;
  isSaving?: boolean;
}

export function WorkingHoursDialog({
  open,
  onOpenChange,
  activeChambers,
  videoConsultationFee,
  editingRule,
  onSave,
  isSaving = false,
}: WorkingHoursDialogProps) {
  const isEditing = Boolean(editingRule);

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [mode, setMode] = useState<"VIDEO" | "CHAMBER">("VIDEO");
  const [chamberId, setChamberId] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [duration, setDuration] = useState(20);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (editingRule) {
        setDayOfWeek(editingRule.dayOfWeek);
        setMode(editingRule.mode);
        setChamberId(editingRule.chamberId ?? activeChambers[0]?.id ?? "");
        setStartTime(editingRule.startTime.slice(0, 5));
        setEndTime(editingRule.endTime.slice(0, 5));
        setDuration(editingRule.slotDurationMinutes);
      } else {
        setDayOfWeek(1);
        setMode(videoConsultationFee !== null ? "VIDEO" : "CHAMBER");
        setChamberId(activeChambers[0]?.id ?? "");
        setStartTime("18:00");
        setEndTime("20:00");
        setDuration(20);
      }
    }
  }, [open, editingRule, activeChambers, videoConsultationFee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (startTime >= endTime) {
      setError("Start time must be earlier than end time.");
      return;
    }

    if (mode === "VIDEO" && videoConsultationFee === null) {
      setError("You must set a video consultation fee in your profile before creating video availability.");
      return;
    }

    if (mode === "CHAMBER" && !chamberId) {
      setError("Please select a practicing chamber location.");
      return;
    }

    const success = await onSave({
      dayOfWeek,
      mode,
      chamberId: mode === "CHAMBER" ? chamberId : "",
      startTime,
      endTime,
      slotDurationMinutes: duration,
    });

    if (success) {
      onOpenChange(false);
    }
  };

  const hasVideoFee = videoConsultationFee !== null;
  const hasChambers = activeChambers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEditing ? "Edit Working Hours" : "Add Recurring Working Hours"}
        description="Configure weekly recurring consultation periods. Availability slots will be generated in Asia/Dhaka time."
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
              {isEditing ? "Save Changes" : "Add Hours"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {error && <Alert kind="error">{error}</Alert>}

          {/* Day of Week */}
          <FormField label="Day of Week" required>
            <Select
              value={String(dayOfWeek)}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              required
            >
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Mode Selection */}
          <FormField label="Consultation Mode" required>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              <button
                type="button"
                onClick={() => setMode("VIDEO")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: mode === "VIDEO" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  backgroundColor: mode === "VIDEO" ? "var(--active-primary-soft)" : "var(--color-bg)",
                  color: mode === "VIDEO" ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontWeight: mode === "VIDEO" ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                <Video size={14} aria-hidden="true" />
                <span>Telehealth Video</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("CHAMBER")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: mode === "CHAMBER" ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  backgroundColor: mode === "CHAMBER" ? "var(--active-primary-soft)" : "var(--color-bg)",
                  color: mode === "CHAMBER" ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontWeight: mode === "CHAMBER" ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                <MapPin size={14} aria-hidden="true" />
                <span>Hospital Chamber</span>
              </button>
            </div>
          </FormField>

          {/* Mode-Specific Requirements */}
          {mode === "VIDEO" && !hasVideoFee && (
            <Alert kind="warning">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
                <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  No video consultation fee configured. You must set a video fee in your{" "}
                  <Link to="/doctor/profile" style={{ textDecoration: "underline", color: "inherit" }}>
                    Practice Profile
                  </Link>{" "}
                  before adding video working hours.
                </div>
              </div>
            </Alert>
          )}

          {mode === "CHAMBER" && (
            <>
              {!hasChambers ? (
                <Alert kind="warning">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
                    <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      No active hospital chambers found. Add a practicing chamber in your{" "}
                      <Link to="/doctor/profile" style={{ textDecoration: "underline", color: "inherit" }}>
                        Practice Profile
                      </Link>{" "}
                      before creating in-person hours.
                    </div>
                  </div>
                </Alert>
              ) : (
                <FormField
                  label="Practicing Chamber Location"
                  hint="Select which verified hospital chamber you will be attending."
                  required
                >
                  <Select
                    value={chamberId}
                    onChange={(e) => setChamberId(e.target.value)}
                    required
                  >
                    {activeChambers.map((c) => {
                      const name = c.hospital?.name ?? "Hospital Chamber";
                      const area = c.hospital?.area ? ` (${c.hospital.area})` : "";
                      const room = c.roomOrUnit ? ` · ${c.roomOrUnit}` : "";
                      const fee = ` [${formatMoney(c.consultationFee)}]`;
                      return (
                        <option key={c.id ?? c.hospitalId} value={c.id ?? c.hospitalId}>
                          {name}
                          {area}
                          {room}
                          {fee}
                        </option>
                      );
                    })}
                  </Select>
                </FormField>
              )}
            </>
          )}

          {/* Time Window */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field
              label="Start Time (HH:mm)"
              value={startTime}
              onChange={setStartTime}
              type="time"
              required
              hint="Dhaka local time"
            />
            <Field
              label="End Time (HH:mm)"
              value={endTime}
              onChange={setEndTime}
              type="time"
              required
              hint="Dhaka local time"
            />
          </div>

          {/* Slot Duration */}
          <FormField
            label="Appointment Slot Duration"
            hint="Length of each bookable consultation slot within this working window."
            required
          >
            <Select
              value={String(duration)}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            >
              <option value="10">10 Minutes (Rapid follow-ups)</option>
              <option value="15">15 Minutes (Standard consultation)</option>
              <option value="20">20 Minutes (Comprehensive consultation)</option>
              <option value="30">30 Minutes (Extended intake)</option>
            </Select>
          </FormField>
        </form>
      </DialogContent>
    </Dialog>
  );
}
