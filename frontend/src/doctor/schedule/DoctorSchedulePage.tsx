import { useState } from "react";
import { Alert, Button } from "../../shared/ui";
import { ScheduleLockedBanner } from "./components/ScheduleLockedBanner/ScheduleLockedBanner";
import { useDoctorSchedule } from "./hooks/useDoctorSchedule";
import { ScheduleToolbar } from "./compact/ScheduleToolbar";
import { WeeklyAgenda } from "./compact/WeeklyAgenda";
import { SchedulePanels } from "./compact/SchedulePanels";
import type { SchedulePanel } from "./compact/scheduleView.model";
import styles from "./compact/ScheduleView.module.css";

export function DoctorSchedulePage() {
  const data = useDoctorSchedule();
  const [panel, setPanel] = useState<SchedulePanel>(null);
  const [filter, setFilter] = useState<"ALL" | "VIDEO" | "CHAMBER">("ALL");
  if (data.loading) return <div role="status" aria-busy="true">Loading schedule…</div>;
  const disabled = data.busy || data.generatingSlots;
  return <div className={styles.page}>
    <ScheduleToolbar approved={data.isApproved && Boolean(data.schedule)}
      leaveCount={data.schedule?.timeOff.length ?? 0} busy={disabled} generating={data.generatingSlots}
      onHours={() => setPanel({ kind: "hours", rule: null })} onLeave={() => setPanel({ kind: "leave" })}
      onEmergency={() => setPanel({ kind: "emergency" })} onGenerate={() => void data.generateSlots()} />
    {data.notice && <Alert kind="success">{data.notice}</Alert>}
    {data.error && !panel && <Alert kind="error"><div className={styles.error}>
      <span>{data.error}</span><Button size="sm" variant="ghost" disabled={disabled}
        onClick={() => void data.reload()}>Retry</Button>
    </div></Alert>}
    {data.profile && !data.isApproved && <ScheduleLockedBanner status={data.profile.applicationStatus} />}
    {data.isApproved && data.schedule && <>
      <WeeklyAgenda rules={data.schedule.rules} chambers={data.activeChambers}
        filter={filter} onFilter={setFilter} disabled={disabled}
        onEdit={(rule) => setPanel({ kind: "hours", rule })} />
      <SchedulePanels panel={panel} onChange={setPanel} data={data} />
    </>}
  </div>;
}
