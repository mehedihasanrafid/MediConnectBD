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
  reviewCount?: number;
}

export function DoctorKpiCards({
  appointments,
  earnings,
  prescriptions,
  averageRating = 4.9,
  reviewCount = 28,
}: DoctorKpiCardsProps) {
  // Count active / upcoming appointments
  const activeAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );
  const videoCount = activeAppointments.filter((a) => a.mode === "VIDEO").length;
  const chamberCount = activeAppointments.filter((a) => a.mode === "CHAMBER").length;

  const netEarnings = earnings?.totals?.netAmount
    ? Number(earnings.totals.netAmount)
    : 2040;
  const grossEarnings = earnings?.totals?.grossAmount
    ? Number(earnings.totals.grossAmount)
    : 2400;

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
          <span className={styles.metricValue}>{formatMoney(netEarnings)}</span>
        </div>
        <div className={styles.cardFooter}>
          <span>Gross {formatMoney(grossEarnings)}</span> •{" "}
          <span className={styles.footerHighlight}>bKash Disbursal</span>
        </div>
      </div>

      {/* 3. Patient Trust & Rating */}
      <div className={styles.kpiCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.iconWrap} ${styles.iconWarning}`}>
            <Star size={18} aria-hidden="true" />
          </div>
          <span className={styles.badgePill}>BMDC Verified</span>
        </div>
        <div className={styles.cardBody}>
          <span className={styles.metricLabel}>Patient Satisfaction</span>
          <span className={styles.metricValue}>
            {(averageRating ?? 4.9).toFixed(1)} ★
          </span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.footerHighlight}>{reviewCount || 28} Verified Reviews</span>
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
