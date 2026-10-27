import { Badge, Card, EmptyState } from "../../../../components/ui";
import type { AvailabilitySlot } from "../../../../shared/types";
import { formatDhakaDate, formatDhakaTime, formatMoney } from "../../../../shared/utils/format";
import { groupSlotsByDate } from "../../utils/doctorSearch.utils";
import styles from "./AvailabilityScheduleGrid.module.css";

interface AvailabilityScheduleGridProps {
  slots: AvailabilitySlot[];
  busySlotId: string | null;
  hasActiveHold: boolean;
  onHoldSlot: (slot: AvailabilitySlot) => Promise<void>;
}

/**
 * Groups available slots by day (next 7 days in Asia/Dhaka) and renders interactive slot buttons.
 */
export function AvailabilityScheduleGrid({
  slots,
  busySlotId,
  hasActiveHold,
  onHoldSlot,
}: AvailabilityScheduleGridProps) {
  const grouped = groupSlotsByDate(slots);

  return (
    <>
      <h2 className={styles.sectionTitle}>Available slots (next 7 days)</h2>
      {grouped.size === 0 && <EmptyState>No slots are currently available.</EmptyState>}

      {[...grouped.entries()].map(([day, daySlots]) => (
        <Card key={day} className={styles.dayCard}>
          <h3 className={styles.dayHeading}>{formatDhakaDate(`${day}T00:00:00.000Z`)}</h3>
          <div className={`slot-grid ${styles.slotGrid}`}>
            {daySlots.map((slot) => (
              <button
                key={slot.id}
                className={`slot ${styles.slotButton}`}
                disabled={busySlotId === slot.id || hasActiveHold}
                onClick={() => void onHoldSlot(slot)}
              >
                <span className={styles.slotTime}>{formatDhakaTime(slot.startAt)}</span>
                <Badge tone={slot.mode === "VIDEO" ? "info" : "neutral"}>{slot.mode}</Badge>
                <span className="muted small">{formatMoney(slot.feeAmount)}</span>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
