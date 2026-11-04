import { RefreshCw } from "lucide-react";

export function EarningsLoadingState() {
  return (
    <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
      <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
      <p>Loading real-time financial ledger...</p>
    </div>
  );
}
