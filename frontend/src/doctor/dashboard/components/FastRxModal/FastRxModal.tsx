import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, Pill, Stethoscope, X } from "lucide-react";
import type { FastRxBundle } from "../../data/fastRxPresets";
import styles from "./FastRxModal.module.css";

export type { FastRxBundle };

interface FastRxModalProps {
  bundle: FastRxBundle | null;
  onClose: () => void;
}

export function FastRxModal({ bundle, onClose }: FastRxModalProps) {
  if (!bundle) return null;

  const handleApplyDraft = () => {
    try {
      localStorage.setItem("mediconnect_rx_draft", JSON.stringify(bundle));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fast-rx-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.titleRow}>
            <div className={styles.iconWrap}>
              <FileText size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="fast-rx-title" className={styles.modalTitle}>
                {bundle.title}
              </h2>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                Fast-RX Clinical Protocol Preset
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Bundle Meta */}
        <div className={styles.bundleMetaBox}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Specialty Category</span>
            <span className={styles.metaValue}>{bundle.category}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Primary Diagnosis</span>
            <span className={styles.metaValue}>{bundle.diagnosis}</span>
          </div>
        </div>

        {/* Medicines Section */}
        <div className={styles.sectionHeading}>
          <Pill size={14} aria-hidden="true" />
          <span>Configured Medicines ({bundle.medicines.length})</span>
        </div>

        <div className={styles.medicineList}>
          {bundle.medicines.map((m, idx) => (
            <div key={`${m.name}-${idx}`} className={styles.medicineCard}>
              <div className={styles.medicineTop}>
                <span className={styles.medicineName}>{m.name}</span>
                <span className={styles.medicineBadge}>{m.dosage}</span>
              </div>
              <div className={styles.medicineDetails}>
                <span>
                  <strong>Freq:</strong> {m.frequency}
                </span>
                <span>•</span>
                <span>
                  <strong>Duration:</strong> {m.duration}
                </span>
                <span>•</span>
                <span>
                  <strong>Instructions:</strong> {m.instruction}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Advice Section */}
        <div className={styles.sectionHeading}>
          <Stethoscope size={14} aria-hidden="true" />
          <span>Clinical Advice & Patient Instructions</span>
        </div>
        <div className={styles.adviceBox}>{bundle.advice}</div>

        {/* Tests Section */}
        {bundle.tests && bundle.tests.length > 0 && (
          <>
            <div className={styles.sectionHeading}>
              <CheckCircle2 size={14} aria-hidden="true" />
              <span>Recommended Diagnostic Investigations</span>
            </div>
            <div className={styles.adviceBox}>{bundle.tests.join(" • ")}</div>
          </>
        )}

        {/* Footer Actions */}
        <div className={styles.actionsFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Dismiss
          </button>
          <Link
            to="/doctor/prescriptions"
            className={styles.btnPrimary}
            onClick={handleApplyDraft}
          >
            <span>Apply to New Prescription</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
