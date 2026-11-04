import { MapPin, Video } from "lucide-react";
import { Button } from "../../../shared/ui";
import type { DoctorChamberDetail } from "../../profile/types/doctorProfile.types";
import type { ScheduleRuleItem } from "../types/doctorSchedule.types";
import { chamberForRule, scheduleDays } from "./scheduleView.model";
import styles from "./ScheduleView.module.css";

export function WeeklyAgenda({ rules, chambers, filter, onFilter, onEdit, disabled }: {
  rules: ScheduleRuleItem[]; chambers: DoctorChamberDetail[]; filter: "ALL" | "VIDEO" | "CHAMBER";
  onFilter: (mode: "ALL" | "VIDEO" | "CHAMBER") => void; onEdit: (rule: ScheduleRuleItem) => void; disabled: boolean;
}) {
  return <section className={styles.agenda} aria-labelledby="weekly-hours-title">
    <div className={styles.agendaTop}><h2 id="weekly-hours-title">Weekly hours</h2>
      <label className={styles.filter}>Show <select aria-label="Filter schedule by consultation mode" value={filter}
        onChange={(event) => onFilter(event.target.value as typeof filter)}>
        <option value="ALL">All types</option><option value="VIDEO">Video</option><option value="CHAMBER">Chamber</option>
      </select></label>
    </div>
    {scheduleDays.map((day, index) => {
      const sessions = rules.filter((rule) => rule.dayOfWeek === index && (filter === "ALL" || rule.mode === filter))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return <section className={styles.day} key={day} aria-label={day}>
        <h3>{day.slice(0, 3)}</h3>
        <div className={styles.sessions}>{!sessions.length ? <p className={styles.off}>No hours</p> : sessions.map((rule) => {
          const chamber = chamberForRule(rule, chambers);
          const start = rule.startTime.slice(0, 5), end = rule.endTime.slice(0, 5);
          const location = chamber?.roomOrUnit || chamber?.hospital?.name;
          const Icon = rule.mode === "VIDEO" ? Video : MapPin;
          return <div className={styles.session} key={rule.id || `${start}:${rule.mode}`}>
            <span className={styles.time}>{start}–{end}</span>
            <span className={styles.mode}><Icon size={14} aria-hidden="true" />
              {rule.mode === "VIDEO" ? "Video" : "Chamber"}
              {rule.isActive === false && <span className={styles.muted}> · Inactive</span>}</span>
            <span className={styles.location} title={chamber?.hospital?.name}>{rule.mode === "CHAMBER" ? location || "Location not set" : ""}</span>
            <Button size="sm" variant="ghost" disabled={disabled}
              aria-label={`Edit ${day} ${start}–${end} ${rule.mode === "VIDEO" ? "video" : "chamber"} hours`}
              onClick={() => onEdit(rule)}>Edit</Button>
          </div>;
        })}</div>
      </section>;
    })}
  </section>;
}
