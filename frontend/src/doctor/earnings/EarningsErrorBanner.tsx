import { AlertCircle } from "lucide-react";
import styles from "./DoctorEarningsPage.module.css";
import type { EarningsErrorBannerProps } from "./types";

export function EarningsErrorBanner({ error, onRetry }: EarningsErrorBannerProps) {
  return (
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
        onClick={onRetry}
        className={styles.refreshBtn}
        style={{ borderColor: "currentColor" }}
      >
        Retry
      </button>
    </div>
  );
}
