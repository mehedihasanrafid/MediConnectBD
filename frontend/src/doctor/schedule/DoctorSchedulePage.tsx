import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Alert, Button } from "../../shared/ui";
import { DeleteRuleDialog } from "./components/DeleteRuleDialog/DeleteRuleDialog";
import { ScheduleLockedBanner } from "./components/ScheduleLockedBanner/ScheduleLockedBanner";
import { SchedulePageHeader } from "./components/SchedulePageHeader/SchedulePageHeader";
import { TimeOffSection } from "./components/TimeOffSection/TimeOffSection";
import { WeeklyCalendarView } from "./components/WeeklyCalendarView/WeeklyCalendarView";
import { WorkingHoursDialog } from "./components/WorkingHoursDialog/WorkingHoursDialog";
import { useDoctorSchedule } from "./hooks/useDoctorSchedule";
import type { ScheduleRuleItem, WorkingHoursFormValues } from "./types/doctorSchedule.types";
import styles from "./DoctorSchedulePage.module.css";

export function DoctorSchedulePage() {
  const {
    profile,
    schedule,
    loading,
    error,
    notice,
    busy,
    generatingSlots,
    isApproved,
    activeChambers,
    addRule,
    editRule,
    removeRule,
    generateSlots,
    addTimeOff,
    removeTimeOff,
    reload,
  } = useDoctorSchedule();

  const [modeFilter, setModeFilter] = useState<"ALL" | "VIDEO" | "CHAMBER">("ALL");

  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScheduleRuleItem | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ScheduleRuleItem | null>(null);

  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  if (loading) {
    return (
      <div className={styles.loadingSkeleton} aria-busy="true" aria-label="Loading doctor schedule">
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonBody} />
      </div>
    );
  }

  const status = profile?.applicationStatus ?? "DRAFT";

  const handleOpenAddHours = () => {
    setEditingRule(null);
    setHoursDialogOpen(true);
  };

  const handleOpenEditRule = (rule: ScheduleRuleItem) => {
    setEditingRule(rule);
    setHoursDialogOpen(true);
  };

  const handleOpenDeleteRule = (rule: ScheduleRuleItem) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleSaveHours = async (values: WorkingHoursFormValues) => {
    if (editingRule && editingRule.id) {
      return editRule(editingRule.id, values);
    }
    return addRule(values);
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete || !ruleToDelete.id) return;
    await removeRule(ruleToDelete.id);
    setRuleToDelete(null);
  };

  return (
    <div className={styles.container}>
      {/* 1. Page Header */}
      <SchedulePageHeader
        status={status}
        isApproved={isApproved}
        modeFilter={modeFilter}
        setModeFilter={setModeFilter}
        onOpenAddHours={handleOpenAddHours}
        onOpenAddLeave={() => setAddLeaveOpen(true)}
        onOpenEmergencyLeave={() => setEmergencyModalOpen(true)}
        onGenerateSlots={() => void generateSlots()}
        generatingSlots={generatingSlots}
      />

      {/* 2. Feedback Notifications */}
      {notice && (
        <Alert kind="success">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{notice}</span>
          </div>
        </Alert>
      )}

      {error && (
        <Alert kind="error">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <span>{error}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void reload()}>
              <RotateCcw size={13} aria-hidden="true" style={{ marginRight: "4px" }} />
              <span>Retry</span>
            </Button>
          </div>
        </Alert>
      )}

      {/* 3. Conditional Content based on Application Status */}
      {!isApproved ? (
        <ScheduleLockedBanner status={status} />
      ) : (
        <>
          {/* Weekly Recurring Calendar View */}
          <WeeklyCalendarView
            rules={schedule?.rules ?? []}
            activeChambers={activeChambers}
            modeFilter={modeFilter}
            onEditRule={handleOpenEditRule}
            onDeleteRule={handleOpenDeleteRule}
          />

          {/* Leave & Exceptions Management */}
          <TimeOffSection
            timeOff={schedule?.timeOff ?? []}
            onAddTimeOff={addTimeOff}
            onRemoveTimeOff={removeTimeOff}
            onEmergencyLeaveCompleted={() => void reload()}
            isSaving={busy}
            addDialogOpen={addLeaveOpen}
            setAddDialogOpen={setAddLeaveOpen}
            emergencyModalOpen={emergencyModalOpen}
            setEmergencyModalOpen={setEmergencyModalOpen}
          />

          {/* Add / Edit Working Hours Dialog */}
          <WorkingHoursDialog
            open={hoursDialogOpen}
            onOpenChange={setHoursDialogOpen}
            activeChambers={activeChambers}
            videoConsultationFee={profile?.videoConsultationFee ?? null}
            editingRule={editingRule}
            onSave={handleSaveHours}
            isSaving={busy}
          />

          {/* Delete Working Hours Confirmation Dialog */}
          <DeleteRuleDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            rule={ruleToDelete}
            onConfirmDelete={handleConfirmDelete}
            isDeleting={busy}
          />
        </>
      )}
    </div>
  );
}
