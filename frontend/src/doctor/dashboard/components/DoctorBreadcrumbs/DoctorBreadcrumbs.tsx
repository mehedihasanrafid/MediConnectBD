import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock, ShieldCheck, Stethoscope } from "lucide-react";
import styles from "./DoctorBreadcrumbs.module.css";

interface DoctorBreadcrumbsProps {
  activeTabLabel: string;
}

export function DoctorBreadcrumbs({ activeTabLabel }: DoctorBreadcrumbsProps) {
  const [dhakaTime, setDhakaTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
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

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className={styles.breadcrumbsBar} aria-label="Breadcrumbs & System Status">
      <div className={styles.trail}>
        <Stethoscope size={14} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
        <Link to="/doctor" className={styles.crumbItem}>
          Doctor Workspace
        </Link>
        <span className={styles.separator} aria-hidden="true">
          <ChevronRight size={12} />
        </span>
        <span className={styles.crumbItem}>Clinical Command Center</span>
        <span className={styles.separator} aria-hidden="true">
          <ChevronRight size={12} />
        </span>
        <span className={styles.crumbActive} aria-current="page">
          {activeTabLabel}
        </span>
      </div>

      <div className={styles.systemBadge}>
        <span className={styles.liveIndicator}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>Realtime Synced</span>
        </span>

        {dhakaTime && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            <Clock size={12} aria-hidden="true" />
            <span>Asia/Dhaka {dhakaTime}</span>
          </span>
        )}

        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          <ShieldCheck size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
          <span>BMDC Encrypted</span>
        </span>
      </div>
    </nav>
  );
}
