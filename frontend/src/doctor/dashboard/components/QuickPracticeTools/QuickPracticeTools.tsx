import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Sliders,
  Video,
} from "lucide-react";
import styles from "./QuickPracticeTools.module.css";

export function QuickPracticeTools() {
  const [broadcastSent, setBroadcastSent] = useState<string | null>(null);

  const handleBroadcast = (mins: string) => {
    setBroadcastSent(mins);
    setTimeout(() => {
      setBroadcastSent(null);
    }, 4000);
  };

  return (
    <div className={styles.toolsCard}>
      <div className={styles.toolsHeader}>
        <div className={styles.iconWrap}>
          <Sliders size={16} aria-hidden="true" />
        </div>
        <div>
          <h3 className={styles.cardTitle}>Practice Tools & Presets</h3>
          <p className={styles.cardSubtitle}>
            Instant patient alerts, Fast-RX templates, and hardware checks
          </p>
        </div>
      </div>

      {/* 1. Chamber Traffic Delay Broadcast */}
      <div className={styles.toolSection}>
        <div className={styles.sectionHeading}>
          <Clock size={13} aria-hidden="true" />
          <span>Chamber Delay Broadcast</span>
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          Notify today&apos;s chamber queue patients if held up by hospital rounds or Dhaka traffic:
        </p>
        <div className={styles.broadcastButtons}>
          <button
            type="button"
            className={`${styles.delayBtn} ${broadcastSent === "15" ? styles.delayBtnSent : ""}`}
            onClick={() => handleBroadcast("15")}
          >
            {broadcastSent === "15" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{broadcastSent === "15" ? "Broadcasted!" : "+15m Delay"}</span>
          </button>

          <button
            type="button"
            className={`${styles.delayBtn} ${broadcastSent === "30" ? styles.delayBtnSent : ""}`}
            onClick={() => handleBroadcast("30")}
          >
            {broadcastSent === "30" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{broadcastSent === "30" ? "Broadcasted!" : "+30m Delay"}</span>
          </button>
        </div>
      </div>

      {/* 2. Fast-RX Clinical Template Bundles */}
      <div className={styles.toolSection}>
        <div className={styles.sectionHeading}>
          <FileText size={13} aria-hidden="true" />
          <span>Fast-RX Bundles</span>
        </div>
        <div className={styles.templateList}>
          <Link to="/doctor/prescriptions" className={styles.templateItem}>
            <span>Respiratory Viral Flu Bundle</span>
            <span className={styles.templateTag}>Napa Extra + Montair</span>
          </Link>
          <Link to="/doctor/prescriptions" className={styles.templateItem}>
            <span>Type 2 Diabetes Follow-up</span>
            <span className={styles.templateTag}>Metformin + HbA1c</span>
          </Link>
          <Link to="/doctor/prescriptions" className={styles.templateItem}>
            <span>Gastritis / Acid Peptic Bundle</span>
            <span className={styles.templateTag}>PPI + Antacid</span>
          </Link>
        </div>
      </div>

      {/* 3. Telehealth Hardware Ready Check */}
      <div className={styles.toolSection}>
        <div className={styles.sectionHeading}>
          <Video size={13} aria-hidden="true" />
          <span>Telehealth Audio/Video Check</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            Daily.co WebRTC HD encrypted
          </span>
          <Link
            to="/communication"
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-primary)",
              fontWeight: "var(--weight-semibold)",
              textDecoration: "none",
            }}
          >
            <span>Test Hardware</span>
            <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle" }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
