/**
 * Displays a doctor's earnings summary (gross revenue, 10% platform commission, net payout,
 * and completed consultations) along with daily and monthly breakdowns.
 */

import { Wallet } from "lucide-react";
import { EmptyState, Text } from "../../../../shared/ui";
import type { DoctorEarningsSummary } from "../../../../shared/types";
import { formatMoney } from "../../../../shared/utils/format";
import styles from "./DoctorEarningsSection.module.css";

interface DoctorEarningsSectionProps {
  earnings: DoctorEarningsSummary | null;
}

export function DoctorEarningsSection({ earnings }: DoctorEarningsSectionProps) {
  if (!earnings) {
    return (
      <div className={styles.section}>
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <div className={styles.iconWrap}>
              <Wallet size={16} aria-hidden="true" />
            </div>
            <h3 className={styles.cardTitle}>Earnings &amp; Revenue Summary</h3>
          </div>
          <span className={styles.payoutBadge}>Eligible Consultations</span>
        </div>
        <EmptyState>
          No eligible earnings data recorded yet. Completed consultations and verified payments
          will appear here.
        </EmptyState>
      </div>
    );
  }

  const netAmount = Number(earnings.totals.netAmount);
  const grossAmount = Number(earnings.totals.grossAmount);
  const commissionAmount = Number(earnings.totals.commissionAmount);

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <div className={styles.iconWrap}>
            <Wallet size={16} aria-hidden="true" />
          </div>
          <h3 className={styles.cardTitle}>Earnings &amp; Revenue Summary</h3>
        </div>
        <span className={styles.payoutBadge}>Eligible Consultations</span>
      </div>

      <div className={styles.heroPayoutBox}>
        <div className={styles.heroPayoutTop}>
          <span className={styles.heroLabel}>Net Doctor Earnings (90%)</span>
        </div>
        <div className={styles.heroAmount}>{formatMoney(netAmount)}</div>
        <div className={styles.ratioBar} aria-hidden="true">
          <div className={styles.ratioDoctor} />
          <div className={styles.ratioPlatform} />
        </div>
        <div className={styles.ratioLegend}>
          <span>Doctor Share (90%)</span>
          <span>Platform Fee (10%)</span>
        </div>
      </div>

      <div className={styles.facts}>
        <div className={styles.factItem}>
          <span className={styles.factLabel}>Gross Revenue</span>
          <span className={styles.factValue}>{formatMoney(grossAmount)}</span>
        </div>
        <div className={styles.factItem}>
          <span className={styles.factLabel}>Platform Fee (10%)</span>
          <span className={styles.factValue}>{formatMoney(commissionAmount)}</span>
        </div>
        <div className={styles.factItem}>
          <span className={styles.factLabel}>Completed Visits</span>
          <span className={styles.factValue}>{earnings.totals.completedConsultations}</span>
        </div>
        <div className={styles.factItem}>
          <span className={styles.factLabel}>Paid Video Visits</span>
          <span className={styles.factValue}>{earnings.totals.succeededPayments}</span>
        </div>
      </div>

      <div className={styles.breakdownTabs}>
        <h4 className={styles.subTitle}>Monthly Summary</h4>
        {earnings.byMonth.length === 0 ? (
          <EmptyState>No monthly records yet.</EmptyState>
        ) : (
          <div className={styles.historyList}>
            {earnings.byMonth.slice(0, 3).map((row) => (
              <div key={row.period} className={styles.historyRow}>
                <span>
                  <strong>{row.period}</strong> ({row.appointmentsCount} visits)
                </span>
                <span>
                  Net: <strong>{formatMoney(Number(row.netAmount))}</strong>{" "}
                  <Text tone="muted" size="sm" as="span">
                    ({formatMoney(Number(row.grossAmount))})
                  </Text>
                </span>
              </div>
            ))}
          </div>
        )}

        <h4 className={styles.subTitle}>Recent Daily Consultations</h4>
        {earnings.byDay.length === 0 ? (
          <EmptyState>No daily records yet.</EmptyState>
        ) : (
          <div className={styles.historyList}>
            {earnings.byDay.slice(0, 4).map((row) => (
              <div key={row.period} className={styles.historyRow}>
                <span>
                  <strong>{row.period}</strong> ({row.appointmentsCount} visits)
                </span>
                <span>
                  Net: <strong>{formatMoney(Number(row.netAmount))}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
