import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";

import type { DoctorAppointment } from "../../../../shared/types";
import { Skeleton } from "../../../../shared/ui";
import styles from "./OperationalKpiCards.module.css";

interface OperationalKpiCardsProps {
  appointments: DoctorAppointment[];
  loading?: boolean;
}

export function OperationalKpiCards({
  appointments,
  loading = false,
}: OperationalKpiCardsProps) {
  if (loading) {
    return (
      <section className={styles.grid} aria-label="Operational KPI summary metrics loading">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.topRow}>
              <Skeleton width="36px" height="36px" radius="var(--radius-md)" />
              <Skeleton width="60px" height="12px" />
            </div>
            <Skeleton width="40px" height="2rem" />
            <Skeleton width="90px" height="10px" />
          </div>
        ))}
      </section>
    );
  }

  // Filter for today in Asia/Dhaka timezone
  const todayDhaka = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

  const todayAppointments = appointments.filter((a) => {
    try {
      const itemDhaka = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(
        new Date(a.scheduledStartAt),
      );
      return itemDhaka === todayDhaka;
    } catch {
      return false;
    }
  });

  const nowMs = Date.now();

  // 1. Scheduled today
  const scheduledCount = todayAppointments.length;
  const videoCount = todayAppointments.filter((a) => a.mode === "VIDEO").length;
  const chamberCount = todayAppointments.filter((a) => a.mode === "CHAMBER").length;

  // 2. Upcoming today (confirmed or pending payment not yet concluded)
  const upcomingCount = todayAppointments.filter((a) => {
    const isPendingOrConfirmed = a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT";
    const endTime = new Date(a.scheduledEndAt).getTime();
    return isPendingOrConfirmed && endTime > nowMs;
  }).length;

  // 3. Completed today
  const completedCount = todayAppointments.filter((a) => a.status === "COMPLETED").length;

  // 4. Needs Attention today (pending payment, no-show, cancelled, or overdue confirmed)
  const needsAttentionCount = todayAppointments.filter((a) => {
    if (a.status === "PENDING_PAYMENT" || a.status === "NO_SHOW" || a.status === "CANCELLED") {
      return true;
    }
    // Overdue confirmed: scheduled start time has passed but appointment has not completed
    if (a.status === "CONFIRMED" && new Date(a.scheduledStartAt).getTime() < nowMs) {
      return true;
    }
    return false;
  }).length;

  return (
    <section className={styles.grid} aria-label="Today's Operational Key Performance Indicators">
      {/* 1. Scheduled Today */}
      <article className={styles.card} aria-label={`Scheduled today: ${scheduledCount} appointments`}>
        <div className={styles.topRow}>
          <div className={`${styles.iconWrap} ${styles.iconPrimary}`} aria-hidden="true">
            <Calendar size={18} />
          </div>
          <span className={styles.label}>Scheduled Today</span>
        </div>
        <div className={styles.valueRow}>
          <span className={styles.metricValue}>{scheduledCount}</span>
        </div>
        <span className={styles.subtext}>
          {scheduledCount === 0
            ? "No bookings today"
            : `${videoCount} Video · ${chamberCount} Chamber`}
        </span>
      </article>

      {/* 2. Upcoming Today */}
      <article className={styles.card} aria-label={`Upcoming today: ${upcomingCount} appointments`}>
        <div className={styles.topRow}>
          <div className={`${styles.iconWrap} ${styles.iconInfo}`} aria-hidden="true">
            <Clock size={18} />
          </div>
          <span className={styles.label}>Upcoming Today</span>
        </div>
        <div className={styles.valueRow}>
          <span className={styles.metricValue}>{upcomingCount}</span>
        </div>
        <span className={styles.subtext}>
          {upcomingCount === 0 ? "No pending sessions" : "Awaiting consultation"}
        </span>
      </article>

      {/* 3. Completed Today */}
      <article className={styles.card} aria-label={`Completed today: ${completedCount} appointments`}>
        <div className={styles.topRow}>
          <div className={`${styles.iconWrap} ${styles.iconSuccess}`} aria-hidden="true">
            <CheckCircle2 size={18} />
          </div>
          <span className={styles.label}>Completed Today</span>
        </div>
        <div className={styles.valueRow}>
          <span className={styles.metricValue}>{completedCount}</span>
        </div>
        <span className={styles.subtext}>
          {completedCount === 0 ? "None completed yet" : "Concluded consultations"}
        </span>
      </article>

      {/* 4. Needs Attention */}
      <article className={styles.card} aria-label={`Needs attention: ${needsAttentionCount} appointments`}>
        <div className={styles.topRow}>
          <div className={`${styles.iconWrap} ${styles.iconWarning}`} aria-hidden="true">
            <AlertCircle size={18} />
          </div>
          <span className={styles.label}>Needs Attention</span>
        </div>
        <div className={styles.valueRow}>
          <span className={styles.metricValue}>{needsAttentionCount}</span>
        </div>
        <span className={styles.subtext}>
          {needsAttentionCount === 0 ? "All in order" : "Pending payment or action"}
        </span>
      </article>
    </section>
  );
}
