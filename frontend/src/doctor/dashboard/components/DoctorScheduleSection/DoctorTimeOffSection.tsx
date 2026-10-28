import { useState } from "react";

import { doctorsApi } from "../../../../api/doctors";
import { Button, Card, EmptyState, Field, Table } from "../../../../shared/ui";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import type { ScheduleOverview } from "./DoctorScheduleSection";
import styles from "./DoctorTimeOffSection.module.css";

interface DoctorTimeOffSectionProps {
  schedule: ScheduleOverview | null;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  setNotice: (notice: string | null) => void;
  onScheduleChanged: () => Promise<void>;
}

export function DoctorTimeOffSection({
  schedule,
  busy,
  setBusy,
  setError,
  setNotice,
  onScheduleChanged,
}: DoctorTimeOffSectionProps) {
  const [offDate, setOffDate] = useState("");
  const [offReason, setOffReason] = useState("");

  async function handleAddTimeOff(event: React.FormEvent) {
    event.preventDefault();
    if (!offDate) return;
    setBusy(true);
    setError(null);
    try {
      await doctorsApi.addTimeOff({
        date: offDate,
        reason: offReason.trim() || null,
      });
      setOffDate("");
      setOffReason("");
      setNotice("Time off added.");
      await onScheduleChanged();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not add time off."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveTimeOff(id: string) {
    setBusy(true);
    setError(null);
    try {
      await doctorsApi.removeTimeOff(id);
      setNotice("Time off removed.");
      await onScheduleChanged();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not remove time off."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2>Time off & blocked dates</h2>
      <form onSubmit={handleAddTimeOff} className={styles.form}>
        <div className={styles.field}>
          <Field label="Date" value={offDate} onChange={setOffDate} type="date" required />
        </div>
        <div className={styles.field}>
          <Field
            label="Reason (optional)"
            value={offReason}
            onChange={setOffReason}
            placeholder="Conference or personal leave"
          />
        </div>
        <div>
          <Button type="submit" disabled={busy}>
            Block full day
          </Button>
        </div>
      </form>

      {!schedule || schedule.timeOff.length === 0 ? (
        <EmptyState>No blocked dates.</EmptyState>
      ) : (
        <div className={styles.tableWrapper}>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Window</th>
                <th>Reason</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schedule.timeOff.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date}</td>
                  <td>
                    {entry.startTime
                      ? `${entry.startTime.slice(0, 5)}–${entry.endTime?.slice(0, 5)}`
                      : "Full day"}
                  </td>
                  <td>{entry.reason ?? "—"}</td>
                  <td className={styles.alignRight}>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => handleRemoveTimeOff(entry.id)}
                    >
                      Unblock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
