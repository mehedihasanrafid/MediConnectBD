/**
 * Displays a doctor's earnings summary (gross revenue, 10% platform commission, net payout,
 * and completed consultations) along with daily and monthly breakdowns.
 */

import { Card, EmptyState, Stack, Text } from "../../../../shared/ui";
import type { DoctorEarningsSummary } from "../../../../shared/types";
import { formatMoney } from "../../../../shared/utils/format";
import styles from "./DoctorEarningsSection.module.css";

interface DoctorEarningsSectionProps {
  earnings: DoctorEarningsSummary | null;
}

export function DoctorEarningsSection({ earnings }: DoctorEarningsSectionProps) {
  if (!earnings) return null;

  return (
    <Card className={styles.section}>
      <h2>Earnings & Payout Summary</h2>
      <dl className={styles.facts}>
        <div>
          <dt>Completed visits</dt>
          <dd>{earnings.totals.completedConsultations}</dd>
        </div>
        <div>
          <dt>Paid video visits</dt>
          <dd>{earnings.totals.succeededPayments}</dd>
        </div>
        <div>
          <dt>Gross earnings</dt>
          <dd>{formatMoney(Number(earnings.totals.grossAmount))}</dd>
        </div>
        <div>
          <dt>Platform fee (10%)</dt>
          <dd>{formatMoney(Number(earnings.totals.commissionAmount))}</dd>
        </div>
        <div>
          <dt>Net doctor payout (90%)</dt>
          <dd>
            <strong className={styles.payoutHighlight}>
              {formatMoney(Number(earnings.totals.netAmount))}
            </strong>
          </dd>
        </div>
      </dl>

      <div className={styles.breakdownGrid}>
        <div>
          <h3>By Month</h3>
          {earnings.byMonth.length === 0 ? (
            <EmptyState>No monthly online payment records yet.</EmptyState>
          ) : (
            <Stack gap={2}>
              {earnings.byMonth.map((row) => (
                <div key={row.period} className={styles.historyRow}>
                  <span>
                    <strong>{row.period}</strong> ({row.appointmentsCount} paid)
                  </span>
                  <span>
                    Net: <strong>{formatMoney(Number(row.netAmount))}</strong>{" "}
                    <Text tone="muted" size="sm" as="span">
                      (Gross {formatMoney(Number(row.grossAmount))})
                    </Text>
                  </span>
                </div>
              ))}
            </Stack>
          )}
        </div>

        <div>
          <h3>By Day (Recent)</h3>
          {earnings.byDay.length === 0 ? (
            <EmptyState>No daily online payment records yet.</EmptyState>
          ) : (
            <Stack gap={2}>
              {earnings.byDay.slice(0, 7).map((row) => (
                <div key={row.period} className={styles.historyRow}>
                  <span>
                    <strong>{row.period}</strong> ({row.appointmentsCount} paid)
                  </span>
                  <span>
                    Net: <strong>{formatMoney(Number(row.netAmount))}</strong>{" "}
                    <Text tone="muted" size="sm" as="span">
                      (Gross {formatMoney(Number(row.grossAmount))})
                    </Text>
                  </span>
                </div>
              ))}
            </Stack>
          )}
        </div>
      </div>
    </Card>
  );
}
