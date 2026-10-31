import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarOff,
  CheckCircle2,
  Clock,
  FileText,
  Sliders,
  Video,
} from "lucide-react";
import { FAST_RX_PRESET_BUNDLES, type FastRxBundle } from "../../data/fastRxPresets";
import styles from "./QuickPracticeTools.module.css";

const PRESET_BUNDLES: FastRxBundle[] = FAST_RX_PRESET_BUNDLES;

interface QuickPracticeToolsProps {
  onSelectFastRxBundle?: (bundle: FastRxBundle) => void;
  onOpenEmergencyLeave?: () => void;
}

export function QuickPracticeTools({
  onSelectFastRxBundle,
  onOpenEmergencyLeave,
}: QuickPracticeToolsProps) {
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
          <span>Fast-RX Protocol Presets</span>
        </div>
        <div className={styles.templateList}>
          {PRESET_BUNDLES.map((bundle) => (
            <button
              key={bundle.id}
              type="button"
              className={styles.templateItem}
              onClick={() => onSelectFastRxBundle?.(bundle)}
            >
              <span>{bundle.title}</span>
              <span className={styles.templateTag}>
                {bundle.medicines[0]?.name.split(" ")[1] ?? "Protocol"} +
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Emergency Absence / Blackout Manager */}
      <div className={styles.toolSection}>
        <div className={styles.sectionHeading}>
          <CalendarOff size={13} aria-hidden="true" />
          <span>Emergency Practice Blackout</span>
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          Need to leave immediately for emergency surgery or ICU round?
        </p>
        <button
          type="button"
          className={styles.emergencyBtn}
          onClick={() => onOpenEmergencyLeave?.()}
        >
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Emergency Chamber Blackout</span>
        </button>
      </div>

      {/* 4. Telehealth Hardware Ready Check */}
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
