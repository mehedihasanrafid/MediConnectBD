import { useState } from "react";
import { AlertTriangle, CalendarOff, Check, X } from "lucide-react";
import { doctorsApi } from "../../../../api/doctors";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import styles from "./EmergencyLeaveModal.module.css";

interface EmergencyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleChanged: () => void;
}

export function EmergencyLeaveModal({
  isOpen,
  onClose,
  onScheduleChanged,
}: EmergencyLeaveModalProps) {
  const [preset, setPreset] = useState<"TODAY_REST" | "EMERGENCY_2H" | "TOMORROW_FULL">(
    "TODAY_REST",
  );
  const [reason, setReason] = useState<string>("Hospital emergency ward duty");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let targetDate = todayStr;
    let startTime: string | null = null;
    let endTime: string | null = null;

    const currentHour = String(now.getHours()).padStart(2, "0");
    const currentMin = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHour}:${currentMin}:00`;

    if (preset === "TODAY_REST") {
      targetDate = todayStr;
      startTime = currentTimeStr;
      endTime = "23:59:00";
    } else if (preset === "EMERGENCY_2H") {
      targetDate = todayStr;
      startTime = currentTimeStr;
      const endH = String(Math.min(now.getHours() + 2, 23)).padStart(2, "0");
      endTime = `${endH}:${currentMin}:00`;
    } else if (preset === "TOMORROW_FULL") {
      targetDate = tomorrowStr;
      startTime = null;
      endTime = null;
    }

    try {
      await doctorsApi.addTimeOff({
        date: targetDate,
        startTime,
        endTime,
        reason: reason.trim() || "Emergency clinical blackout",
      });
      onScheduleChanged();
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not apply blackout period."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.titleRow}>
            <div className={styles.iconWrap}>
              <CalendarOff size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="emergency-modal-title" className={styles.modalTitle}>
                Emergency Practice Blackout
              </h2>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                Instantly block slots for surgery rounds or hospital duties
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div style={{ color: "var(--color-danger)", fontSize: "var(--text-xs)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Preset Selection */}
          <div className={styles.presetsRow}>
            <button
              type="button"
              className={`${styles.presetBtn} ${preset === "TODAY_REST" ? styles.presetBtnActive : ""}`}
              onClick={() => setPreset("TODAY_REST")}
            >
              <div>
                <div className={styles.presetTitle}>Block Rest of Today</div>
                <div className={styles.presetSub}>Cancels incoming bookings from now until midnight</div>
              </div>
              {preset === "TODAY_REST" && <Check size={16} aria-hidden="true" />}
            </button>

            <button
              type="button"
              className={`${styles.presetBtn} ${preset === "EMERGENCY_2H" ? styles.presetBtnActive : ""}`}
              onClick={() => setPreset("EMERGENCY_2H")}
            >
              <div>
                <div className={styles.presetTitle}>Emergency Hospital Duty (+2 Hours)</div>
                <div className={styles.presetSub}>Temporary 2-hour window block for emergency rounds</div>
              </div>
              {preset === "EMERGENCY_2H" && <Check size={16} aria-hidden="true" />}
            </button>

            <button
              type="button"
              className={`${styles.presetBtn} ${preset === "TOMORROW_FULL" ? styles.presetBtnActive : ""}`}
              onClick={() => setPreset("TOMORROW_FULL")}
            >
              <div>
                <div className={styles.presetTitle}>Tomorrow Full Day Leave</div>
                <div className={styles.presetSub}>Entire day marked unavailable across all chambers</div>
              </div>
              {preset === "TOMORROW_FULL" && <Check size={16} aria-hidden="true" />}
            </button>
          </div>

          {/* Reason Input */}
          <div className={styles.formGroup}>
            <label htmlFor="blackout-reason" className={styles.label}>
              Reason for Absence (Optional)
            </label>
            <input
              id="blackout-reason"
              type="text"
              className={styles.input}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hospital ICU round, Dhaka traffic delay"
            />
          </div>

          {/* Actions */}
          <div className={styles.actionsFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnDanger}
              disabled={loading}
            >
              <AlertTriangle size={15} aria-hidden="true" />
              <span>{loading ? "Blocking slots…" : "Apply Blackout Now"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
