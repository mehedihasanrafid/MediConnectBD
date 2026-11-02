import { useState } from "react";
import { CalendarOff, Clock, Plus, Trash2 } from "lucide-react";
import { Button, Table } from "../../../../shared/ui";
import { EmergencyLeaveModal } from "../../../dashboard/components/EmergencyLeaveModal";
import type { AddTimeOffFormValues, TimeOffItem } from "../../types/doctorSchedule.types";
import { AddTimeOffDialog } from "./AddTimeOffDialog";
import styles from "./TimeOffSection.module.css";

interface TimeOffSectionProps {
  timeOff: TimeOffItem[];
  onAddTimeOff: (values: AddTimeOffFormValues) => Promise<boolean>;
  onRemoveTimeOff: (timeOffId: string) => Promise<boolean>;
  onEmergencyLeaveCompleted: () => void;
  isSaving?: boolean;
  addDialogOpen?: boolean;
  setAddDialogOpen?: (open: boolean) => void;
  emergencyModalOpen?: boolean;
  setEmergencyModalOpen?: (open: boolean) => void;
}

export function TimeOffSection({
  timeOff,
  onAddTimeOff,
  onRemoveTimeOff,
  onEmergencyLeaveCompleted,
  isSaving = false,
  addDialogOpen: externalAddOpen,
  setAddDialogOpen: externalSetAddOpen,
  emergencyModalOpen: externalEmergencyOpen,
  setEmergencyModalOpen: externalSetEmergencyOpen,
}: TimeOffSectionProps) {
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [internalEmergencyOpen, setInternalEmergencyOpen] = useState(false);

  const addDialogOpen = externalAddOpen !== undefined ? externalAddOpen : internalAddOpen;
  const setAddDialogOpen = externalSetAddOpen !== undefined ? externalSetAddOpen : setInternalAddOpen;

  const emergencyModalOpen = externalEmergencyOpen !== undefined ? externalEmergencyOpen : internalEmergencyOpen;
  const setEmergencyModalOpen = externalSetEmergencyOpen !== undefined ? externalSetEmergencyOpen : setInternalEmergencyOpen;

  return (
    <section className={styles.container} aria-label="Leave and Blockout Management">
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>Time Off &amp; Blocked Periods</h2>
          <p className={styles.subheading}>
            Manage scheduled leave, conference days, and emergency blackout periods.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEmergencyModalOpen(true)}
            aria-label="Open emergency leave blackout presets"
          >
            <CalendarOff size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
            <span>Emergency Blackout</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            aria-label="Add custom leave period"
          >
            <Plus size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
            <span>Add Leave Date</span>
          </Button>
        </div>
      </div>

      {timeOff.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarOff size={32} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>No blocked dates or leave periods are recorded.</h3>
          <p className={styles.emptyDescription}>
            All weekly working periods remain active according to your recurring schedule rules.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <Table>
            <thead>
              <tr>
                <th scope="col">Leave Date</th>
                <th scope="col">Blocked Window</th>
                <th scope="col">Reason / Details</th>
                <th scope="col" style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {timeOff.map((entry) => {
                const isFullDay = !entry.startTime && !entry.endTime;
                const windowText = isFullDay
                  ? "Full Day (24 hrs)"
                  : `${entry.startTime?.slice(0, 5)} – ${entry.endTime?.slice(0, 5)}`;

                return (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 600 }}>{entry.date}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
                        <span>{windowText}</span>
                      </span>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {entry.reason ? entry.reason : "Personal / Emergency Leave"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void onRemoveTimeOff(entry.id)}
                        disabled={isSaving}
                        aria-label={`Remove time off for ${entry.date}`}
                        style={{ color: "var(--color-danger)" }}
                      >
                        <Trash2 size={13} aria-hidden="true" style={{ marginRight: "4px" }} />
                        <span>Remove</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Add Time Off Modal Dialog */}
      <AddTimeOffDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={onAddTimeOff}
        isSaving={isSaving}
      />

      {/* Emergency Leave Modal Presets */}
      <EmergencyLeaveModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        onScheduleChanged={() => {
          setEmergencyModalOpen(false);
          onEmergencyLeaveCompleted();
        }}
      />
    </section>
  );
}
