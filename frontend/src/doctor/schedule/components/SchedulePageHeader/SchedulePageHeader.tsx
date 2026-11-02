import clsx from "clsx";
import {
  CalendarOff,
  Clock,
  Globe,
  MapPin,
  Plus,
  RefreshCw,
  Video,
} from "lucide-react";
import { Badge, Button } from "../../../../shared/ui";
import type { DoctorApplicationStatus } from "../../../dashboard/types/doctorDashboard.types";
import styles from "./SchedulePageHeader.module.css";

interface SchedulePageHeaderProps {
  status: DoctorApplicationStatus;
  isApproved: boolean;
  modeFilter: "ALL" | "VIDEO" | "CHAMBER";
  setModeFilter: (filter: "ALL" | "VIDEO" | "CHAMBER") => void;
  onOpenAddHours: () => void;
  onOpenAddLeave: () => void;
  onOpenEmergencyLeave: () => void;
  onGenerateSlots: () => void;
  generatingSlots?: boolean;
}

export function SchedulePageHeader({
  status,
  isApproved,
  modeFilter,
  setModeFilter,
  onOpenAddHours,
  onOpenAddLeave,
  onOpenEmergencyLeave,
  onGenerateSlots,
  generatingSlots = false,
}: SchedulePageHeaderProps) {
  return (
    <header className={styles.header} aria-label="Schedule and Leave Header">
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.heading}>Schedule &amp; Leave</h1>
            <Badge tone={isApproved ? "success" : "warning"}>
              {isApproved ? "Application Approved" : status.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className={styles.description}>
            Set recurring weekly consultation hours, manage physical chamber &amp; telemedicine slots,
            and configure blackout leave.
          </p>
        </div>

        {isApproved && (
          <div className={styles.actionsArea}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={generatingSlots}
              onClick={onGenerateSlots}
              aria-label="Generate rolling 7-day appointment slots"
            >
              <RefreshCw size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>Generate 7-Day Slots</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onOpenEmergencyLeave}
              aria-label="Emergency blackout"
            >
              <CalendarOff size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>Emergency Blackout</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onOpenAddLeave}
              aria-label="Add leave or blocked date"
            >
              <Plus size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>Add Leave</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenAddHours}
              aria-label="Add working hours"
            >
              <Plus size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>Add Working Hours</span>
            </Button>
          </div>
        )}
      </div>

      {isApproved && (
        <div className={styles.bottomToolbar}>
          <div className={styles.filterPills} role="group" aria-label="Filter schedule by consultation mode">
            <button
              type="button"
              className={clsx(styles.filterPill, modeFilter === "ALL" && styles.filterPillActive)}
              onClick={() => setModeFilter("ALL")}
              aria-pressed={modeFilter === "ALL"}
            >
              <Globe size={13} aria-hidden="true" />
              <span>All Modes</span>
            </button>

            <button
              type="button"
              className={clsx(styles.filterPill, modeFilter === "VIDEO" && styles.filterPillActive)}
              onClick={() => setModeFilter("VIDEO")}
              aria-pressed={modeFilter === "VIDEO"}
            >
              <Video size={13} aria-hidden="true" />
              <span>Telehealth Video</span>
            </button>

            <button
              type="button"
              className={clsx(styles.filterPill, modeFilter === "CHAMBER" && styles.filterPillActive)}
              onClick={() => setModeFilter("CHAMBER")}
              aria-pressed={modeFilter === "CHAMBER"}
            >
              <MapPin size={13} aria-hidden="true" />
              <span>Hospital Chambers</span>
            </button>
          </div>

          <div className={styles.timezoneNotice}>
            <Clock size={13} aria-hidden="true" />
            <span>Timezone: Asia/Dhaka (All slots generated in Bangladesh Standard Time)</span>
          </div>
        </div>
      )}
    </header>
  );
}
