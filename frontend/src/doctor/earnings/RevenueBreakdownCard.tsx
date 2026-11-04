import { useMemo, useState } from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { formatMoney } from "../../shared/utils/format";
import styles from "./DoctorEarningsPage.module.css";
import type { PeriodTab, RevenueBreakdownCardProps } from "./types";

export function RevenueBreakdownCard({ byDay, byMonth }: RevenueBreakdownCardProps) {
  const [activePeriodTab, setActivePeriodTab] = useState<PeriodTab>("day");

  const periodRows = useMemo(() => {
    return activePeriodTab === "day" ? byDay : byMonth;
  }, [byDay, byMonth, activePeriodTab]);

  const maxNetInPeriods = useMemo(() => {
    if (periodRows.length === 0) return 1;
    const max = Math.max(...periodRows.map((r) => Number(r.netAmount) || 0));
    return max > 0 ? max : 1;
  }, [periodRows]);

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <TrendingUp size={18} />
          Revenue Over Time
        </h2>
        <div className={styles.tabPillGroup} role="tablist" aria-label="Breakdown period">
          <button
            type="button"
            role="tab"
            aria-selected={activePeriodTab === "day"}
            className={`${styles.tabPill} ${activePeriodTab === "day" ? styles.tabPillActive : ""}`}
            onClick={() => setActivePeriodTab("day")}
          >
            Daily ({byDay.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePeriodTab === "month"}
            className={`${styles.tabPill} ${activePeriodTab === "month" ? styles.tabPillActive : ""}`}
            onClick={() => setActivePeriodTab("month")}
          >
            Monthly ({byMonth.length})
          </button>
        </div>
      </div>

      {periodRows.length === 0 ? (
        <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          <Calendar size={28} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
          <p>No eligible revenue records found for this period filter.</p>
        </div>
      ) : (
        <>
          {/* Visual Bar Progression */}
          <div className={styles.barsContainer} aria-label="Revenue distribution bars">
            {periodRows.slice(0, 7).map((row) => {
              const netVal = Number(row.netAmount) || 0;
              const pct = Math.min(100, Math.max(8, Math.round((netVal / maxNetInPeriods) * 100)));
              return (
                <div key={row.period} className={styles.barRow}>
                  <div className={styles.barMeta}>
                    <span style={{ fontWeight: 600 }}>{row.period}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {formatMoney(row.netAmount)} ({row.appointmentsCount} visits)
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Financial Ledger Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Visits</th>
                  <th>Gross Billing</th>
                  <th>Platform (10%)</th>
                  <th>Net Earnings</th>
                </tr>
              </thead>
              <tbody>
                {periodRows.map((row) => (
                  <tr key={row.period}>
                    <td style={{ fontWeight: 600 }}>{row.period}</td>
                    <td>{row.appointmentsCount}</td>
                    <td>{formatMoney(row.grossAmount)}</td>
                    <td>{formatMoney(row.commissionAmount)}</td>
                    <td style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                      {formatMoney(row.netAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
