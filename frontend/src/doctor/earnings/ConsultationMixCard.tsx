import { Building, Video } from "lucide-react";
import styles from "./DoctorEarningsPage.module.css";
import type { ConsultationMixCardProps } from "./types";

export function ConsultationMixCard({ mixStats }: ConsultationMixCardProps) {
  return (
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
  );
}
