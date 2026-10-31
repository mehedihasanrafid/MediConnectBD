import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock, Heart, ShieldCheck } from "lucide-react";
import styles from "./PatientBreadcrumbs.module.css";

interface PatientBreadcrumbsProps {
  activePageLabel: string;
}

export function PatientBreadcrumbs({ activePageLabel }: PatientBreadcrumbsProps) {
  const [dhakaTime, setDhakaTime] = useState("");

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
    <nav className={styles.breadcrumbsBar} aria-label="Patient Navigation & Health System Status">
      <div className={styles.trail}>
        <Heart size={14} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
        <Link to="/appointments" className={styles.crumbItem}>
          Patient Portal
        </Link>
        <span className={styles.separator} aria-hidden="true">
          <ChevronRight size={12} />
        </span>
        <span className={styles.crumbItem}>My Health Records</span>
        <span className={styles.separator} aria-hidden="true">
          <ChevronRight size={12} />
        </span>
        <span className={styles.crumbActive} aria-current="page">
          {activePageLabel}
        </span>
      </div>

      <div className={styles.systemBadge}>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>Realtime Synced</span>
        </div>

        {dhakaTime && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} aria-hidden="true" />
            <span>Asia/Dhaka {dhakaTime}</span>
          </span>
        )}

        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ShieldCheck size={13} style={{ color: "var(--color-success)" }} aria-hidden="true" />
          <span>Encrypted Records</span>
        </span>
      </div>
    </nav>
  );
}
