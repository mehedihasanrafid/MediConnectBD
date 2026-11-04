import { useState } from "react";
import { Alert, Button, Dialog, DialogContent } from "../../../../shared/ui";
import type { DoctorChamberDetail } from "../../../profile/types/doctorProfile.types";
import type { ScheduleRuleItem, WorkingHoursFormValues } from "../../types/doctorSchedule.types";
import { WorkingHoursFields } from "./WorkingHoursFields";
import styles from "../../compact/ScheduleView.module.css";

interface WorkingHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeChambers: DoctorChamberDetail[];
  videoConsultationFee: number | null;
  editingRule?: ScheduleRuleItem | null;
  onSave: (values: WorkingHoursFormValues) => Promise<boolean>;
  onRemove?: () => void;
  isSaving?: boolean;
  serverError?: string | null;
}

const defaults: WorkingHoursFormValues = {
  dayOfWeek: 1, mode: "VIDEO", chamberId: "", startTime: "18:00", endTime: "20:00", slotDurationMinutes: 20,
};

export function WorkingHoursDialog(props: WorkingHoursDialogProps) {
  return props.open ? <WorkingHoursForm key={props.editingRule?.id ?? "new"} {...props} /> : null;
}

function WorkingHoursForm({ open, onOpenChange, activeChambers, videoConsultationFee,
  editingRule, onSave, onRemove, isSaving = false, serverError }: WorkingHoursDialogProps) {
  const [values, setValues] = useState<WorkingHoursFormValues>(() => editingRule ? {
    dayOfWeek: editingRule.dayOfWeek, mode: editingRule.mode,
    chamberId: editingRule.chamberId ?? "", startTime: editingRule.startTime.slice(0, 5),
    endTime: editingRule.endTime.slice(0, 5), slotDurationMinutes: editingRule.slotDurationMinutes,
  } : { ...defaults, mode: videoConsultationFee !== null ? "VIDEO" : "CHAMBER",
    chamberId: activeChambers[0]?.id ?? activeChambers[0]?.hospitalId ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setAttempted(true);
    if (isSaving) return;
    if (values.startTime >= values.endTime) { setError("Start must be earlier than end."); return; }
    if (values.mode === "VIDEO" && videoConsultationFee === null) { setError("Set a video fee in Profile first."); return; }
    if (values.mode === "CHAMBER" && !values.chamberId) { setError("Select an active chamber."); return; }
    try {
      if (await onSave({ ...values, chamberId: values.mode === "CHAMBER" ? values.chamberId : "" })) onOpenChange(false);
    } catch { setError("Could not save hours. Please try again."); }
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!isSaving) onOpenChange(next); }}>
    <DialogContent title={editingRule ? "Edit hours" : "Add hours"} description="Weekly hours · Dhaka (UTC+6)"
      footer={<div className={styles.actions}>
        {onRemove && <Button variant="danger" disabled={isSaving} onClick={onRemove}>Remove hours</Button>}
        <Button variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" form="working-hours-form" loading={isSaving}>Save hours</Button>
      </div>}>
      <form id="working-hours-form" className={styles.stack} onSubmit={submit}>
        {(error || attempted && serverError) && <Alert kind="error">{error || serverError}</Alert>}
        <WorkingHoursFields values={values} onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
          chambers={activeChambers} videoFee={videoConsultationFee} busy={isSaving} />
      </form>
    </DialogContent>
  </Dialog>;
}
