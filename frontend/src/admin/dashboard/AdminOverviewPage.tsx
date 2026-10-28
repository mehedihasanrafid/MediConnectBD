import { RefreshCw } from "lucide-react";

import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/Page";
import { SkeletonCard } from "../../shared/ui/Skeleton";
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
      <PageHeader
        eyebrow="Platform Analytics"
        title="Platform overview"
        description="Real-time operational totals across MediConnect BD."
        actions={
          <Button
            variant="ghost"
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            leftIcon={<RefreshCw size={16} className={loading ? styles.spinning : ""} />}
          >
            Refresh
          </Button>
        }
      />

      {error && <Alert kind="error">{error}</Alert>}

      {loading && !overview ? (
        <div className={styles.loadingGrid} aria-label="Loading platform metrics">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonCard key={index} />
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
