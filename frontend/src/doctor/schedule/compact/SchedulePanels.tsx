import { WorkingHoursDialog } from "../components/WorkingHoursDialog/WorkingHoursDialog";
import { DeleteRuleDialog } from "../components/DeleteRuleDialog/DeleteRuleDialog";
import { AddTimeOffDialog } from "../components/TimeOffSection/AddTimeOffDialog";
import type { useDoctorSchedule } from "../hooks/useDoctorSchedule";
import type { SchedulePanel } from "./scheduleView.model";
import { LeaveDrawer } from "./LeaveDrawer";
import { EmergencyLeaveDialog } from "./EmergencyLeaveDialog";
import { RemoveLeaveDialog } from "./RemoveLeaveDialog";

export function SchedulePanels({ panel, onChange, data }: {
  panel: SchedulePanel; onChange: (panel: SchedulePanel) => void; data: ReturnType<typeof useDoctorSchedule>;
}) {
  const close = () => {
    onChange(null);
    requestAnimationFrame(() => document.getElementById("schedule-page-title")?.focus());
  };
  if (!panel) return null;
  if (panel.kind === "hours") return <WorkingHoursDialog open editingRule={panel.rule} activeChambers={data.activeChambers}
    videoConsultationFee={data.profile?.videoConsultationFee ?? null} isSaving={data.busy} serverError={data.error}
    onOpenChange={(open) => { if (!open) close(); }}
    onSave={(values) => panel.rule?.id ? data.editRule(panel.rule.id, values) : data.addRule(values)}
    onRemove={panel.rule?.id ? () => onChange({ kind: "remove-hours", rule: panel.rule! }) : undefined} />;
  if (panel.kind === "remove-hours") return <DeleteRuleDialog open rule={panel.rule} isDeleting={data.busy}
    serverError={data.error} onOpenChange={(open) => { if (!open) close(); }}
    onConfirmDelete={() => panel.rule.id ? data.removeRule(panel.rule.id) : Promise.resolve(false)} />;
  if (panel.kind === "leave") return <LeaveDrawer entries={data.schedule?.timeOff ?? []} busy={data.busy} onClose={close}
    onAdd={() => onChange({ kind: "add-leave" })} onRemove={(entry) => onChange({ kind: "remove-leave", entry })} />;
  if (panel.kind === "add-leave") return <AddTimeOffDialog open isSaving={data.busy} serverError={data.error}
    onSave={data.addTimeOff} onOpenChange={(open) => { if (!open) close(); }} />;
  if (panel.kind === "remove-leave") return <RemoveLeaveDialog entry={panel.entry} busy={data.busy} serverError={data.error}
    onClose={close} onRemove={() => data.removeTimeOff(panel.entry.id)} />;
  return <EmergencyLeaveDialog busy={data.busy} serverError={data.error} onClose={close} onSave={data.addTimeOff} />;
}
