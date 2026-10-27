import { RefreshCw } from "lucide-react";

import { Alert } from "../../components/ui";
import styles from "./AdminOverview.module.css";
import { OverviewSummaryCards } from "./components/OverviewSummaryCards";
import { TopSpecialtiesAndDoctors } from "./components/TopSpecialtiesAndDoctors";
import { useAdminOverview } from "./hooks/useAdminOverview";

/**
 * Route page for /admin/overview. Composes KPI cards, shimmer loading skeletons, and operational panels.
 */
export function AdminOverviewPage() {
  const { overview, loading, error, refresh } = useAdminOverview();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Platform Analytics</p>
          <h1>Platform overview</h1>
          <p>Real-time operational totals across MediConnect BD.</p>
        </div>

        <div className={styles.actions}>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? styles.spinning : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {error && <Alert kind="error">{error}</Alert>}

      {loading && !overview ? (
        <div className={styles.loadingGrid} aria-label="Loading platform metrics">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-card" />
          ))}
        </div>
      ) : overview ? (
        <>
          <OverviewSummaryCards overview={overview} />
          <TopSpecialtiesAndDoctors overview={overview} />
        </>
      ) : null}
    </div>
  );
}
