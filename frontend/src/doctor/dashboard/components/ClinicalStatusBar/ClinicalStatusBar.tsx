import { useEffect, useState } from "react";
import { Activity, Clock, Database, Package, ShieldCheck, Wifi } from "lucide-react";
import styles from "./ClinicalStatusBar.module.css";

interface ClinicalStatusBarProps {
  bmdcNumber: string;
}

export function ClinicalStatusBar({ bmdcNumber }: ClinicalStatusBarProps) {
  const [dhakaTime, setDhakaTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDhakaTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className={styles.statusBar} aria-label="Clinical System Status Bar">
      <div className={styles.leftGroup}>
        <div className={styles.statusItem}>
          <span className={styles.liveDot} aria-hidden="true" />
          <Wifi size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
          <span>Daily.co WebRTC HD: Connected (22ms)</span>
        </div>

        <div className={styles.statusItem}>
          <Database size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
          <span>Sync Gateway: Active</span>
        </div>

        <div className={styles.statusItem}>
          <Activity size={12} style={{ color: "var(--color-info)" }} aria-hidden="true" />
          <span>Audio/Video Latency: Optimal</span>
        </div>
      </div>

      <div className={styles.rightGroup}>
        <div className={styles.statusItem}>
          <Clock size={12} aria-hidden="true" />
          <span>Asia/Dhaka {dhakaTime}</span>
        </div>

        <div className={styles.statusItem}>
          <ShieldCheck size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
          <span>BMDC #{bmdcNumber}</span>
        </div>

        <div className={styles.versionBadge}>
          <Package size={10} aria-hidden="true" />
          <span>v1.4.0 (.deb)</span>
        </div>
      </div>
    </footer>
  );
}
