import { Calendar, CheckCircle2, DollarSign, Receipt, TrendingUp } from "lucide-react";
import { formatMoney } from "../../shared/utils/format";
import styles from "./DoctorEarningsPage.module.css";
import type { EarningsKpiGridProps } from "./types";

export function EarningsKpiGrid({ totals }: EarningsKpiGridProps) {
  return (
    <div className={styles.kpiGrid}>
      {/* Hero Net Earnings */}
      <div className={`${styles.kpiCard} ${styles.kpiCardHero}`}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiLabel}>Net Doctor Earnings (90%)</span>
          <span className={styles.kpiIconWrap}>
            <DollarSign size={16} />
          </span>
        </div>
        <div className={styles.kpiValue} data-testid="kpi-net-amount">
          {formatMoney(totals.netAmount)}
        </div>
        <div className={styles.kpiSub}>Calculated doctor share after 10% platform fee</div>
      </div>

      {/* Gross Revenue */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiLabel}>Gross Patient Billing</span>
          <span className={styles.kpiIconWrap}>
            <TrendingUp size={16} />
          </span>
        </div>
        <div className={styles.kpiValue} data-testid="kpi-gross-amount">
          {formatMoney(totals.grossAmount)}
        </div>
        <div className={styles.kpiSub}>Total paid by patients through gateway</div>
      </div>

      {/* Platform Service Fee */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiLabel}>Platform Service Fee (10%)</span>
          <span className={styles.kpiIconWrap}>
            <Receipt size={16} />
          </span>
        </div>
        <div className={styles.kpiValue} data-testid="kpi-commission-amount">
          {formatMoney(totals.commissionAmount)}
        </div>
        <div className={styles.kpiSub}>Fixed platform commission deducted</div>
      </div>

      {/* Completed Consultations */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiLabel}>Completed Consultations</span>
          <span className={styles.kpiIconWrap}>
            <CheckCircle2 size={16} />
          </span>
        </div>
        <div className={styles.kpiValue} data-testid="kpi-completed-consultations">
          {totals.completedConsultations}
        </div>
        <div className={styles.kpiSub}>Total verified completed consultations</div>
      </div>

      {/* Successful Patient Payments */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiLabel}>Successful Patient Payments</span>
          <span className={styles.kpiIconWrap}>
            <Calendar size={16} />
          </span>
        </div>
        <div className={styles.kpiValue} data-testid="kpi-succeeded-payments">
          {totals.succeededPayments}
        </div>
        <div className={styles.kpiSub}>Cleared gateway payment transactions</div>
      </div>
    </div>
  );
}
