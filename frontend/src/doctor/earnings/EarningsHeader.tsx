import { RefreshCw } from "lucide-react";
import { DoctorBreadcrumbs } from "../dashboard/components/DoctorBreadcrumbs";
import styles from "./DoctorEarningsPage.module.css";
import type { EarningsHeaderProps } from "./types";

export function EarningsHeader({ isLoading, onRefresh }: EarningsHeaderProps) {
  return (
    <>
      <DoctorBreadcrumbs activeTabLabel="Earnings & Financial Performance" />
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
          onClick={onRefresh}
          disabled={isLoading}
          className={styles.refreshBtn}
          aria-label="Refresh earnings data"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : undefined} />
          {isLoading ? "Refreshing..." : "Refresh Records"}
        </button>
      </div>
    </>
  );
}
