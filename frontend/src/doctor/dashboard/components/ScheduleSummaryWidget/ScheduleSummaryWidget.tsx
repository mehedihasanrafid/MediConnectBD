import { AlertCircle, CalendarDays, Clock, MapPin, Video } from "lucide-react";

import { Badge, Button } from "../../../../shared/ui";
import type { ScheduleOverview } from "../DoctorScheduleSection";
import styles from "./ScheduleSummaryWidget.module.css";

interface ScheduleSummaryWidgetProps {
  schedule: ScheduleOverview | null;
  isApproved?: boolean;
  onOpenManageSchedule: () => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleSummaryWidget({
  schedule,
  isApproved = true,
  onOpenManageSchedule,
}: ScheduleSummaryWidgetProps) {
  // Determine today in Asia/Dhaka
  const now = new Date();
  const dhakaDayIndex = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
  ).getDay();
  const todayName = DAY_NAMES[dhakaDayIndex];
  const todayDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(now);

  if (!isApproved) {
    return (
      <section className={styles.card} aria-label="Today's Consultation Schedule">
        <div className={styles.headerRow}>
          <div className={styles.eyebrow}>
            <CalendarDays size={14} aria-hidden="true" />
            <span>Today&#39;s Sessions ({todayName})</span>
          </div>
          <Badge tone="neutral">Verification Pending</Badge>
        </div>

        <div className={styles.emptyState}>
          <strong className={styles.emptyTitle}>Schedule Locked</strong>
          <p className={styles.emptyDesc}>
            Weekly consultation schedule and slot generation become active after your application is approved.
          </p>
        </div>
      </section>
    );
  }

  // Find active rules for today
  const todayRules = schedule?.rules?.filter(
    (r) => r.dayOfWeek === dhakaDayIndex && r.isActive,
  ) ?? [];

  // Check for time off today
  const todayTimeOff = schedule?.timeOff?.find((t) => t.date === todayDateStr);

  return (
    <section className={styles.card} aria-label="Today's Consultation Schedule">
      <div className={styles.headerRow}>
        <div className={styles.eyebrow}>
          <CalendarDays size={14} aria-hidden="true" />
          <span>Today&#39;s Sessions ({todayName})</span>
        </div>
        <Badge tone={todayRules.length > 0 ? "success" : "neutral"}>
          {todayRules.length > 0 ? `${todayRules.length} Active` : "Off-Duty"}
        </Badge>
      </div>

      {todayTimeOff && (
        <div className={styles.timeOffAlert} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>
            Leave Block Active: {todayTimeOff.reason || "Doctor unavailable today"}
            {todayTimeOff.startTime && ` (${todayTimeOff.startTime.slice(0, 5)} - ${todayTimeOff.endTime?.slice(0, 5)})`}
          </span>
        </div>
      )}

      {todayRules.length === 0 ? (
        <div className={styles.emptyState}>
          <strong className={styles.emptyTitle}>No Sessions Scheduled Today</strong>
          <p className={styles.emptyDesc}>
            You have not configured regular consultation hours for {todayName}.
          </p>
        </div>
      ) : (
        <div className={styles.sessionList}>
          {todayRules.map((rule) => {
            const isVideo = rule.mode === "VIDEO";
            return (
              <div key={rule.id} className={styles.sessionItem}>
                <div className={styles.sessionTime}>
                  <Clock size={13} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                  <span>
                    {rule.startTime.slice(0, 5)} – {rule.endTime.slice(0, 5)}
                  </span>
                </div>

                <div className={styles.sessionMeta}>
                  <Badge tone={isVideo ? "primary" : "neutral"}>
                    {isVideo ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Video size={11} aria-hidden="true" /> Video
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <MapPin size={11} aria-hidden="true" /> Chamber
                      </span>
                    )}
                  </Badge>
                  <span style={{ color: "var(--color-text-muted)" }}>{rule.slotDurationMinutes}m slots</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.actionRow}>
        <Button size="sm" variant="secondary" onClick={onOpenManageSchedule}>
          <CalendarDays size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
          Manage Weekly Schedule
        </Button>
      </div>
    </section>
  );
}
