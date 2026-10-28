/**
 * Inline rescheduling panel for an upcoming appointment. Fetches available slots for the same
 * doctor and consultation mode over the next 7 days and atomically moves the appointment.
 */

import { useEffect, useState } from "react";

import { appointmentsApi } from "../../../../api/appointments";
import { doctorsApi } from "../../../../api/doctors";
import { Alert, Badge, Button, EmptyState, Spinner, Text } from "../../../../shared/ui";
import type { Appointment, AvailabilitySlot } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatDhakaDate, formatDhakaTime, formatMoney } from "../../../../shared/utils/format";
import styles from "./ReschedulePanel.module.css";

interface ReschedulePanelProps {
  appointment: Appointment;
  onRescheduled: (updated: Appointment) => void;
  onCancel: () => void;
}

export function ReschedulePanel({ appointment, onRescheduled, onCancel }: ReschedulePanelProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void doctorsApi
      .getAvailability(appointment.doctorId, 7)
      .then((res) => {
        if (cancelled) return;
        setSlots(
          res.items.filter(
            (slot) => slot.mode === appointment.mode && slot.id !== appointment.slot.id,
          ),
        );
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load available slots."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.doctorId, appointment.mode, appointment.slot.id]);

  async function handleSelectSlot(slotId: string) {
    setBusySlotId(slotId);
    setError(null);
    try {
      const updated = await appointmentsApi.rescheduleAppointment(appointment.id, slotId);
      onRescheduled(updated);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not reschedule to this slot."));
    } finally {
      setBusySlotId(null);
    }
  }

  const grouped = new Map<string, AvailabilitySlot[]>();
  for (const s of slots) {
    const day = s.startAt.slice(0, 10);
    grouped.set(day, [...(grouped.get(day) ?? []), s]);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Reschedule consultation</h4>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <Text tone="muted" size="sm">
        Select a new available {appointment.mode.toLowerCase()} slot. Your fee payment transfers
        automatically.
      </Text>

      {loading && <Spinner label="Loading available alternative slots…" />}
      {error && <Alert kind="error">{error}</Alert>}

      {!loading && slots.length === 0 && (
        <EmptyState>No alternative slots currently open for this doctor.</EmptyState>
      )}

      {[...grouped.entries()].map(([day, daySlots]) => (
        <div key={day} className={styles.dayCard}>
          <strong>{formatDhakaDate(`${day}T00:00:00.000Z`)}</strong>
          <div className={styles.slotList}>
            {daySlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={styles.slotButton}
                disabled={busySlotId === slot.id}
                onClick={() => void handleSelectSlot(slot.id)}
              >
                <span>{formatDhakaTime(slot.startAt)}</span>
                <Badge tone={slot.mode === "VIDEO" ? "info" : "neutral"}>{slot.mode}</Badge>
                <Text tone="muted" size="sm" as="span">{formatMoney(slot.feeAmount)}</Text>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
