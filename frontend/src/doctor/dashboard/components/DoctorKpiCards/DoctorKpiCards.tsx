import {
  CreditCard,
  FileText,
  Star,
  Users,
} from "lucide-react";
import type { DoctorAppointment, DoctorEarningsSummary, Prescription } from "../../../../shared/types";
import { formatMoney } from "../../../../shared/utils/format";
import styles from "./DoctorKpiCards.module.css";

interface DoctorKpiCardsProps {
  appointments: DoctorAppointment[];
  earnings: DoctorEarningsSummary | null;
  prescriptions: Prescription[];
  averageRating?: number | null;
  reviewCount?: number | null;
  isApproved?: boolean;
}

export function DoctorKpiCards({
  appointments,
  earnings,
  prescriptions,
  averageRating,
  reviewCount,
  isApproved = true,
}: DoctorKpiCardsProps) {
  // Count active / upcoming appointments
  const activeAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );
  const videoCount = activeAppointments.filter((a) => a.mode === "VIDEO").length;
  const chamberCount = activeAppointments.filter((a) => a.mode === "CHAMBER").length;

  // Real API earnings only — zero invented fallbacks
  const hasEarnings = Boolean(earnings && earnings.totals && earnings.totals.netAmount !== undefined);
  const netEarnings = hasEarnings ? Number(earnings!.totals.netAmount) : null;
  const grossEarnings = hasEarnings ? Number(earnings!.totals.grossAmount) : null;

  const hasRating = averageRating !== undefined && averageRating !== null;

  return (
    <div className={styles.kpiGrid}>
      {/* 1. Today's Consultations */}
      <div className={styles.kpiCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.iconWrap} ${styles.iconPrimary}`}>
            <Users size={18} aria-hidden="true" />
          </div>
          <span className={`${styles.badgePill} ${styles.badgeActive}`}>
            Queue Active
          </span>
        </div>
        <div className={styles.cardBody}>
          <span className={styles.metricLabel}>Active Consultations</span>
          <span className={styles.metricValue}>
            {activeAppointments.length}{" "}
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-regular)" }}>
              Patients
            </span>
          </span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.footerHighlight}>{videoCount} Telehealth</span> •{" "}
          <span>{chamberCount} Chamber</span>
        </div>
      </div>

      {/* 2. Doctor Wallet & Net Payout */}
      <div className={styles.kpiCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.iconWrap} ${styles.iconSuccess}`}>
            <CreditCard size={18} aria-hidden="true" />
          </div>
          <span className={styles.badgePill}>90% Net</span>
        </div>
        <div className={styles.cardBody}>
          <span className={styles.metricLabel}>Net Doctor Payout</span>
          <span className={styles.metricValue}>
            {netEarnings !== null ? formatMoney(netEarnings) : "—"}
          </span>
        </div>
        <div className={styles.cardFooter}>
          {hasEarnings ? (
            <>
              <span>Gross {formatMoney(grossEarnings!)}</span> •{" "}
              <span className={styles.footerHighlight}>bKash Disbursal</span>
            </>
          ) : (
            <span>Awaiting settled consultations</span>
          )}
        </div>
      </div>

      {/* 3. Patient Trust & Rating */}
      <div className={styles.kpiCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.iconWrap} ${styles.iconWarning}`}>
            <Star size={18} aria-hidden="true" />
          </div>
          <span className={styles.badgePill}>
            {isApproved ? "BMDC Verified" : "Verification Pending"}
          </span>
        </div>
        <div className={styles.cardBody}>
          <span className={styles.metricLabel}>Patient Satisfaction</span>
          <span className={styles.metricValue}>
            {hasRating ? `${averageRating.toFixed(1)} ★` : "—"}
          </span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.footerHighlight}>
            {hasRating && (reviewCount ?? 0) > 0
              ? `${reviewCount} Verified Reviews`
              : "No reviews recorded yet"}
          </span>
        </div>
      </div>

      {/* 4. Digital Prescriptions */}
      <div className={styles.kpiCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.iconWrap} ${styles.iconInfo}`}>
            <FileText size={18} aria-hidden="true" />
          </div>
          <span className={styles.badgePill}>24h Edit Active</span>
        </div>
        <div className={styles.cardBody}>
          <span className={styles.metricLabel}>Prescriptions Issued</span>
          <span className={styles.metricValue}>{prescriptions.length} Issued</span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.footerHighlight}>100% Digital QR</span> verified
        </div>
      </div>
    </div>
  );
}
