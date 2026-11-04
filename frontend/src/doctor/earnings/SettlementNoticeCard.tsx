import { Info } from "lucide-react";
import styles from "./DoctorEarningsPage.module.css";

export function SettlementNoticeCard() {
  return (
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
  );
}
