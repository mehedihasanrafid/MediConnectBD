import styles from "./DoctorEarningsPage.module.css";
import { ConsultationMixCard } from "./ConsultationMixCard";
import { EarningsErrorBanner } from "./EarningsErrorBanner";
import { EarningsHeader } from "./EarningsHeader";
import { EarningsKpiGrid } from "./EarningsKpiGrid";
import { EarningsLoadingState } from "./EarningsLoadingState";
import { RevenueBreakdownCard } from "./RevenueBreakdownCard";
import { SettlementNoticeCard } from "./SettlementNoticeCard";
import type { DoctorEarningsPageProps } from "./types";
import { useDoctorEarnings } from "./useDoctorEarnings";

export type { DoctorEarningsPageProps };

export function DoctorEarningsPage(props: DoctorEarningsPageProps = {}) {
  const { earnings, isLoading, error, handleRefresh, mixStats } = useDoctorEarnings(props);

  return (
    <div className={styles.container}>
      <EarningsHeader isLoading={isLoading} onRefresh={handleRefresh} />

      {error && <EarningsErrorBanner error={error} onRetry={handleRefresh} />}

      {isLoading && !earnings && <EarningsLoadingState />}

      {earnings && (
        <>
          <EarningsKpiGrid totals={earnings.totals} />

          <div className={styles.contentGrid}>
            <RevenueBreakdownCard byDay={earnings.byDay} byMonth={earnings.byMonth} />

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <ConsultationMixCard mixStats={mixStats} />
              <SettlementNoticeCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DoctorEarningsPage;
