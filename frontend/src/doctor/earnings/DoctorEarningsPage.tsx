import { useEffect, useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Video,
  Building,
  Info,
} from "lucide-react";
import { doctorsApi } from "../../api/doctors";
import { DoctorBreadcrumbs } from "../dashboard/components/DoctorBreadcrumbs";
import { formatMoney } from "../../shared/utils/format";
import type { DoctorEarningsSummary, DoctorAppointment } from "../../shared/types";
import styles from "./DoctorEarningsPage.module.css";

export interface DoctorEarningsPageProps {
  initialEarnings?: DoctorEarningsSummary | null;
  initialAppointments?: DoctorAppointment[];
}

export function DoctorEarningsPage({
  initialEarnings,
  initialAppointments,
}: DoctorEarningsPageProps = {}) {
  const [earnings, setEarnings] = useState<DoctorEarningsSummary | null>(initialEarnings ?? null);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>(initialAppointments ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(initialEarnings === undefined);
  const [error, setError] = useState<string | null>(null);
  const [activePeriodTab, setActivePeriodTab] = useState<"day" | "month">("day");

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [earningsRes, appointmentsRes] = await Promise.all([
        doctorsApi.getMyEarnings(),
        doctorsApi.listMyAppointments(),
      ]);
      setEarnings(earningsRes);
      setAppointments(appointmentsRes.items || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load financial records";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    void loadData();
  };

  useEffect(() => {
    if (initialEarnings === undefined) {
      void loadData();
    }
  }, [loadData, initialEarnings]);

  // Derive mode visit distribution strictly from verified completed appointments
  const mixStats = useMemo(() => {
    const completed = appointments.filter((a) => a.status === "COMPLETED");
    const videoList = completed.filter((a) => a.mode === "VIDEO");
    const chamberList = completed.filter((a) => a.mode === "CHAMBER");

    const totalCount = completed.length;
    const videoPct = totalCount > 0 ? Math.round((videoList.length / totalCount) * 100) : 50;
    const chamberPct = totalCount > 0 ? 100 - videoPct : 50;

    return {
      totalCount,
      videoCount: videoList.length,
      videoPct,
      chamberCount: chamberList.length,
      chamberPct,
    };
  }, [appointments]);

  // Selected periods list
  const periodRows = useMemo(() => {
    if (!earnings) return [];
    return activePeriodTab === "day" ? earnings.byDay : earnings.byMonth;
  }, [earnings, activePeriodTab]);

  // Max net amount in periods for bar scaling
  const maxNetInPeriods = useMemo(() => {
    if (periodRows.length === 0) return 1;
    const max = Math.max(...periodRows.map((r) => Number(r.netAmount) || 0));
    return max > 0 ? max : 1;
  }, [periodRows]);

  return (
    <div className={styles.container}>
      <DoctorBreadcrumbs activeTabLabel="Earnings & Financial Performance" />

      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerTextGroup}>
          <span className={styles.eyebrow}>Practice Revenue & Earnings</span>
          <h1 className={styles.title}>Doctor Earnings & Financial Performance</h1>
          <p className={styles.description}>
            Real-time summary of eligible patient consultation payments, platform commission, and completed encounters.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className={styles.refreshBtn}
          aria-label="Refresh earnings data"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : undefined} />
          {isLoading ? "Refreshing..." : "Refresh Records"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--color-danger-soft, #fee2e2)",
            color: "var(--color-danger, #b91c1c)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <AlertCircle size={20} />
          <div style={{ flex: 1 }}>
            <strong>Unable to retrieve financial metrics:</strong> {error}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className={styles.refreshBtn}
            style={{ borderColor: "currentColor" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !earnings && (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
          <p>Loading real-time financial ledger...</p>
        </div>
      )}

      {/* Dashboard Content */}
      {earnings && (
        <>
          {/* KPI Cards Grid */}
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
                {formatMoney(earnings.totals.netAmount)}
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
                {formatMoney(earnings.totals.grossAmount)}
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
                {formatMoney(earnings.totals.commissionAmount)}
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
                {earnings.totals.completedConsultations}
              </div>
              <div className={styles.kpiSub}>Total verified completed consultations</div>
            </div>

            {/* Successful Patient Payments (Renamed from Settled Transactions) */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>Successful Patient Payments</span>
                <span className={styles.kpiIconWrap}>
                  <Calendar size={16} />
                </span>
              </div>
              <div className={styles.kpiValue} data-testid="kpi-succeeded-payments">
                {earnings.totals.succeededPayments}
              </div>
              <div className={styles.kpiSub}>Cleared gateway payment transactions</div>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className={styles.contentGrid}>
            {/* Left: Revenue Over Time & Breakdown Table */}
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
                    Daily ({earnings.byDay.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePeriodTab === "month"}
                    className={`${styles.tabPill} ${activePeriodTab === "month" ? styles.tabPillActive : ""}`}
                    onClick={() => setActivePeriodTab("month")}
                  >
                    Monthly ({earnings.byMonth.length})
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

            {/* Right: Completed Consultations by Mode & Neutral Settlement Statement */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              {/* Completed Consultations by Mode (Strictly Visit Counts Only) */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <Video size={18} />
                    Completed Consultations by Mode
                  </h2>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    Total: {mixStats.totalCount} visits
                  </span>
                </div>

                <div className={styles.mixRatioBar} aria-label="Video vs Chamber Ratio">
                  <div
                    className={styles.mixRatioVideo}
                    style={{ width: `${mixStats.videoPct}%` }}
                    title={`Video: ${mixStats.videoPct}%`}
                  />
                  <div
                    className={styles.mixRatioChamber}
                    style={{ width: `${mixStats.chamberPct}%` }}
                    title={`Chamber: ${mixStats.chamberPct}%`}
                  />
                </div>

                <div className={styles.mixBreakdown}>
                  <div className={styles.mixItem}>
                    <div className={styles.mixItemLeft}>
                      <span className={styles.mixDotVideo} />
                      <Video size={14} style={{ color: "var(--color-primary)" }} />
                      <span>Video Sessions</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>{mixStats.videoCount} visits</div>
                      <div style={{ color: "var(--color-text-secondary)" }}>
                        {mixStats.videoPct}% of total
                      </div>
                    </div>
                  </div>

                  <div className={styles.mixItem}>
                    <div className={styles.mixItemLeft}>
                      <span className={styles.mixDotChamber} />
                      <Building size={14} style={{ color: "var(--color-info)" }} />
                      <span>Physical Chamber</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>{mixStats.chamberCount} visits</div>
                      <div style={{ color: "var(--color-text-secondary)" }}>
                        {mixStats.chamberPct}% of total
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settlement & Payout Policy (Accurate & Neutral) */}
              <div className={styles.noticeCard}>
                <Info size={20} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-primary)" }} />
                <div>
                  <strong style={{ display: "block", marginBottom: "4px", color: "var(--color-text)" }}>
                    Settlement &amp; Payout Policy
                  </strong>
                  Your earnings are calculated from eligible consultations. Payout scheduling and settlement information
                  are not available in this dashboard.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
