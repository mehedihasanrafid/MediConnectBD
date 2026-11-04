import { Activity } from "lucide-react";
import styles from "./TodayPatientRadar.module.css";

interface RadarHeaderProps {
  activeCount: number;
}

export function RadarHeader({ activeCount }: RadarHeaderProps) {
  return (
    <div className={styles.radarHeader}>
      <div className={styles.titleGroup}>
        <div className={styles.radarIconWrap}>
          <Activity size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 className={styles.radarTitle}>Today&apos;s Patient Radar &amp; Queue</h2>
          <p className={styles.radarSubtitle}>
            Live clinical intake, scheduled appointments, and instant telehealth calls
          </p>
        </div>
      </div>

      <div className={styles.activeCountBadge}>
        <span className={styles.pulseDot} aria-hidden="true" />
        <span>{activeCount} in Queue</span>
      </div>
    </div>
  );
}
