/**
 * Interactive weekly schedule rules, 7-day slot generation, and time-off management for doctors.
 */

import { useState } from "react";

import { doctorsApi } from "../../../../api/doctors";
import { Alert, Badge, Button, Card, EmptyState, Field, FormField, Select, Table, Text } from "../../../../shared/ui";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import styles from "./DoctorScheduleSection.module.css";
import { DoctorTimeOffSection } from "./DoctorTimeOffSection";

export interface ScheduleRule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  mode: "VIDEO" | "CHAMBER";
  chamberId?: string | null;
  isActive: boolean;
}

export interface ScheduleOverview {
  timezone: string;
  rules: ScheduleRule[];
  timeOff: Array<{
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    reason?: string | null;
  }>;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function DoctorScheduleSection({
  schedule,
  onScheduleChanged,
}: {
  schedule: ScheduleOverview | null;
  onScheduleChanged: () => Promise<void>;
}) {
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [duration, setDuration] = useState("20");
  const [addingRule, setAddingRule] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleAddRule(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const existing = (schedule?.rules ?? []).map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime.slice(0, 5),
        endTime: r.endTime.slice(0, 5),
        slotDurationMinutes: r.slotDurationMinutes,
        mode: r.mode,
        ...(r.chamberId ? { chamberId: r.chamberId } : {}),
      }));
      existing.push({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        slotDurationMinutes: Number(duration),
        mode: "VIDEO",
      });
      await doctorsApi.replaceMySchedule(existing);
      setAddingRule(false);
      setNotice("Weekly schedule updated and availability regenerated.");
      await onScheduleChanged();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not update weekly schedule."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveRule(ruleId: string) {
    setBusy(true);
    setError(null);
    try {
      const remaining = (schedule?.rules ?? [])
        .filter((r) => r.id !== ruleId)
        .map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime.slice(0, 5),
          endTime: r.endTime.slice(0, 5),
          slotDurationMinutes: r.slotDurationMinutes,
          mode: r.mode,
          ...(r.chamberId ? { chamberId: r.chamberId } : {}),
        }));
      await doctorsApi.replaceMySchedule(remaining);
      setNotice("Schedule rule removed.");
      await onScheduleChanged();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not remove rule."));
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateSlots() {
    setBusy(true);
    setError(null);
    try {
      const res = await doctorsApi.generateSlots();
      setNotice(`Generated ${res.generated} bookable slots for the next 7 days.`);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not generate slots."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.scheduleContainer}>
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <Card>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Weekly schedule</h2>
            <Text tone="muted" size="sm">Timezone: {schedule?.timezone ?? "Asia/Dhaka"}</Text>
          </div>
          <div className={styles.ruleActions}>
            <Button variant="secondary" disabled={busy} onClick={() => setAddingRule(!addingRule)}>
              {addingRule ? "Close form" : "+ Add rule"}
            </Button>
            <Button disabled={busy} onClick={() => void handleGenerateSlots()}>
              Regenerate 7-day slots
            </Button>
          </div>
        </div>

        {addingRule && (
          <form onSubmit={handleAddRule} className={styles.ruleForm}>
            <FormField label="Day of week">
              <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                {DAY_NAMES.map((name, idx) => (
                  <option key={name} value={String(idx)}>
                    {name}
                  </option>
                ))}
              </Select>
            </FormField>
            <Field label="Start (HH:MM)" value={startTime} onChange={setStartTime} required />
            <Field label="End (HH:MM)" value={endTime} onChange={setEndTime} required />
            <FormField label="Slot duration">
              <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="15">15 min</option>
                <option value="20">20 min</option>
                <option value="30">30 min</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={busy}>
              Save rule
            </Button>
          </form>
        )}

        {!schedule || schedule.rules.length === 0 ? (
          <EmptyState>No weekly schedule configured.</EmptyState>
        ) : (
          <div className={styles.tableWrapper}>
            <Table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Hours</th>
                  <th>Slot</th>
                  <th>Mode</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {schedule.rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{DAY_NAMES[rule.dayOfWeek]}</td>
                    <td>
                      {rule.startTime.slice(0, 5)}–{rule.endTime.slice(0, 5)}
                    </td>
                    <td>{rule.slotDurationMinutes} min</td>
                    <td>
                      <Badge tone={rule.mode === "VIDEO" ? "info" : "neutral"}>{rule.mode}</Badge>
                    </td>
                    <td className={styles.alignRight}>
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => void handleRemoveRule(rule.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <DoctorTimeOffSection
        schedule={schedule}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        setNotice={setNotice}
        onScheduleChanged={onScheduleChanged}
      />
    </div>
  );
}
