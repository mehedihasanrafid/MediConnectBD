import { useState } from "react";
import clsx from "clsx";
import { Clock, Edit2, MapPin, Trash2, Video } from "lucide-react";
import type { DoctorChamberDetail } from "../../../profile/types/doctorProfile.types";
import type { ScheduleRuleItem } from "../../types/doctorSchedule.types";
import styles from "./WeeklyCalendarView.module.css";

const WEEKDAYS = [
  { index: 0, short: "Sun", full: "Sunday" },
  { index: 1, short: "Mon", full: "Monday" },
  { index: 2, short: "Tue", full: "Tuesday" },
  { index: 3, short: "Wed", full: "Wednesday" },
  { index: 4, short: "Thu", full: "Thursday" },
  { index: 5, short: "Fri", full: "Friday" },
  { index: 6, short: "Sat", full: "Saturday" },
];

interface WeeklyCalendarViewProps {
  rules: ScheduleRuleItem[];
  activeChambers: DoctorChamberDetail[];
  modeFilter: "ALL" | "VIDEO" | "CHAMBER";
  onEditRule: (rule: ScheduleRuleItem) => void;
  onDeleteRule: (rule: ScheduleRuleItem) => void;
}

export function WeeklyCalendarView({
  rules,
  activeChambers,
  modeFilter,
  onEditRule,
  onDeleteRule,
}: WeeklyCalendarViewProps) {
  const [selectedMobileDay, setSelectedMobileDay] = useState(1); // Monday default

  const filteredRules = rules.filter((r) => {
    if (modeFilter === "ALL") return true;
    return r.mode === modeFilter;
  });

  const getRulesForDay = (dayIndex: number) => {
    return filteredRules
      .filter((r) => r.dayOfWeek === dayIndex)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const renderRuleCard = (rule: ScheduleRuleItem) => {
    const isVideo = rule.mode === "VIDEO";
    const start = rule.startTime.slice(0, 5);
    const end = rule.endTime.slice(0, 5);

    const chamber = !isVideo && rule.chamberId
      ? activeChambers.find((c) => c.id === rule.chamberId || c.hospitalId === rule.chamberId)
      : null;

    const chamberName =
      rule.chamber?.hospital?.name ?? chamber?.hospital?.name ?? "Hospital Chamber";
    const chamberRoom =
      rule.chamber?.roomOrUnit ?? chamber?.roomOrUnit
        ? ` (${rule.chamber?.roomOrUnit ?? chamber?.roomOrUnit})`
        : "";

    return (
      <div
        key={rule.id ?? `${rule.dayOfWeek}-${start}-${rule.mode}`}
        className={clsx(
          styles.ruleCard,
          isVideo ? styles.ruleCardVideo : styles.ruleCardChamber,
        )}
      >
        <div className={styles.ruleTimeRow}>
          <span className={styles.timeText}>{`${start} – ${end}`}</span>
          <span
            className={clsx(
              styles.modeBadge,
              isVideo ? styles.modeBadgeVideo : styles.modeBadgeChamber,
            )}
          >
            {isVideo ? (
              <>
                <Video size={10} aria-hidden="true" />
                <span>Video</span>
              </>
            ) : (
              <>
                <MapPin size={10} aria-hidden="true" />
                <span>Chamber</span>
              </>
            )}
          </span>
        </div>

        {!isVideo && (
          <div className={styles.chamberInfo}>
            <span style={{ fontWeight: 600 }}>{chamberName}</span>
            <span>{chamberRoom}</span>
          </div>
        )}

        <div className={styles.durationBadge}>
          <Clock size={10} style={{ display: "inline", marginRight: "3px" }} aria-hidden="true" />
          <span>{`${rule.slotDurationMinutes} min consultations`}</span>
        </div>

        <div className={styles.ruleActions}>
          <button
            type="button"
            className={styles.actionIconBtn}
            onClick={() => onEditRule(rule)}
            aria-label={`Edit ${start} to ${end} working hours`}
          >
            <Edit2 size={12} />
          </button>
          <button
            type="button"
            className={clsx(styles.actionIconBtn, styles.deleteIconBtn)}
            onClick={() => onDeleteRule(rule)}
            aria-label={`Remove ${start} to ${end} working hours`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className={styles.container} aria-label="Weekly Working Schedule Calendar">
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>Recurring Weekly Consultation Schedule</h2>
          <p className={styles.subheading}>
            Configured weekly working blocks used by the appointment engine to generate booking slots.
          </p>
        </div>
      </div>

      {/* Desktop 7-Day Calendar Grid */}
      <div className={styles.calendarGrid} role="grid" aria-label="7-Day Weekly Schedule">
        {WEEKDAYS.map((day) => {
          const dayRules = getRulesForDay(day.index);
          return (
            <div key={day.index} className={styles.dayColumn}>
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{day.full}</span>
              </div>
              <div className={styles.dayRulesList}>
                {dayRules.length === 0 ? (
                  <div className={styles.emptyDay}>No hours set</div>
                ) : (
                  dayRules.map((r) => renderRuleCard(r))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Day Selector & Sessions Container */}
      <div className={styles.mobileDaySelector} role="tablist" aria-label="Week day selector">
        {WEEKDAYS.map((day) => {
          const count = getRulesForDay(day.index).length;
          const isActive = selectedMobileDay === day.index;
          return (
            <button
              key={day.index}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={clsx(
                styles.mobileDayButton,
                isActive && styles.mobileDayButtonActive,
              )}
              onClick={() => setSelectedMobileDay(day.index)}
            >
              <span>{day.short}</span>
              <span style={{ fontSize: "10px", opacity: 0.8 }}>{`(${count})`}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.mobileRulesContainer}>
        {getRulesForDay(selectedMobileDay).length === 0 ? (
          <div className={styles.emptyDay} style={{ padding: "var(--space-6)" }}>
            No working hours configured for {WEEKDAYS[selectedMobileDay]?.full}.
          </div>
        ) : (
          getRulesForDay(selectedMobileDay).map((r) => renderRuleCard(r))
        )}
      </div>
    </section>
  );
}
