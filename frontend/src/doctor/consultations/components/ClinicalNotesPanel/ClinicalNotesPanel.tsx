import { useState } from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  Pill,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { Prescription } from "../../../../shared/types";
import {
  FAST_RX_PRESET_BUNDLES,
  type FastRxBundle,
} from "../../../dashboard/data/fastRxPresets";
import type { EncounterClinicalNotes } from "../../types/doctorConsultation.types";
import styles from "./ClinicalNotesPanel.module.css";

interface ClinicalNotesPanelProps {
  notes: EncounterClinicalNotes;
  onUpdateNote: <K extends keyof EncounterClinicalNotes>(
    field: K,
    value: EncounterClinicalNotes[K],
  ) => void;
  onApplyFastRx: (bundle: FastRxBundle) => void;
  onOpenHistory: () => void;
  onOpenPrescription: () => void;
  onCompleteConsultation: () => Promise<boolean>;
  isCompleted: boolean;
  existingPrescription: Prescription | null;
  busy: boolean;
}

export function ClinicalNotesPanel({
  notes,
  onUpdateNote,
  onApplyFastRx,
  onOpenHistory,
  onOpenPrescription,
  onCompleteConsultation,
  isCompleted,
  existingPrescription,
  busy,
}: ClinicalNotesPanelProps) {
  const [selectedBundleForReview, setSelectedBundleForReview] = useState<FastRxBundle | null>(null);

  const handleApplyPreset = (bundle: FastRxBundle) => {
    onApplyFastRx(bundle);
    setSelectedBundleForReview(null);
  };

  return (
    <aside className={styles.container} aria-label="Clinical Documentation Panel">
      <div className={styles.panelHeader}>
        <div className={styles.titleRow}>
          <Stethoscope size={18} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <h2 className={styles.heading}>Clinical Documentation</h2>
              <span style={{ fontSize: "0.625rem", padding: "1px 6px", background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontWeight: 600 }}>
                In-Memory Scratchpad (Unsaved)
              </span>
            </div>
            <p className={styles.subheading}>Assessment, findings &amp; treatment plan (session-only)</p>
          </div>
        </div>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={onOpenHistory}
          aria-label="Inspect patient clinical records and reports"
        >
          <FileSpreadsheet size={13} aria-hidden="true" />
          <span>Patient EHR History</span>
        </button>
      </div>

      {/* Preset Review Dialog / Inline card */}
      {selectedBundleForReview && (
        <div style={{ padding: "var(--space-3)", background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text)" }}>
              Fast-RX Preset: {selectedBundleForReview.title}
            </span>
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}
              onClick={() => setSelectedBundleForReview(null)}
            >
              Cancel
            </button>
          </div>
          <p style={{ margin: "4px 0", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            Diagnosis: <strong>{selectedBundleForReview.diagnosis}</strong> ({selectedBundleForReview.medicines.length} medications)
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button
              type="button"
              className={styles.primaryActionBtn}
              style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
              onClick={() => handleApplyPreset(selectedBundleForReview)}
            >
              Apply to Clinical Notes
            </button>
          </div>
        </div>
      )}

      {/* Quick Protocol Presets */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", fontWeight: 700, color: "var(--color-text-muted)" }}>
          <Sparkles size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} aria-hidden="true" />
          Fast-RX Guidelines Presets
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {FAST_RX_PRESET_BUNDLES.slice(0, 3).map((bundle) => (
            <button
              key={bundle.id}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                fontSize: "0.6875rem",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
              onClick={() => setSelectedBundleForReview(bundle)}
            >
              <Pill size={10} aria-hidden="true" />
              <span>{bundle.title.split(" ")[0]} Protocol</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Clinical Assessment */}
      <div className={styles.formGroup}>
        <label htmlFor="notes-complaint" className={styles.label}>
          Chief Complaint &amp; History of Present Illness
        </label>
        <textarea
          id="notes-complaint"
          className={styles.textarea}
          placeholder="e.g. Fever, persistent dry cough for 3 days, sore throat…"
          value={notes.chiefComplaint}
          onChange={(e) => onUpdateNote("chiefComplaint", e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="notes-findings" className={styles.label}>
          Clinical Examination / Physical Findings
        </label>
        <textarea
          id="notes-findings"
          className={styles.textarea}
          placeholder="e.g. Bilateral chest clear, pharyngeal congestion, tonsillar erythema…"
          value={notes.clinicalFindings}
          onChange={(e) => onUpdateNote("clinicalFindings", e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="notes-diagnosis" className={styles.label}>
          Provisional / Final Diagnosis
        </label>
        <input
          id="notes-diagnosis"
          type="text"
          className={styles.input}
          placeholder="e.g. Acute Upper Respiratory Tract Infection (Viral Pharyngitis)"
          value={notes.diagnosis}
          onChange={(e) => onUpdateNote("diagnosis", e.target.value)}
        />
      </div>

      {/* Section 2: Clinical Plan */}
      <div className={styles.formGroup}>
        <label htmlFor="notes-advice" className={styles.label}>
          Physician Advice &amp; Lifestyle Guidance
        </label>
        <textarea
          id="notes-advice"
          className={styles.textarea}
          placeholder="e.g. Warm water gargle, rest, adequate hydration, return if fever persists…"
          value={notes.advice}
          onChange={(e) => onUpdateNote("advice", e.target.value)}
        />
      </div>

      {/* Persistence Note */}
      <div className={styles.noticeBox}>
        <Info size={14} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-primary)" }} aria-hidden="true" />
        <div>
          <strong>In-Memory Clinical Scratchpad:</strong> Notes and vitals recorded here are maintained in-memory for this active session only. The backend does not currently support remote encounter note persistence. If prescribing, your entered diagnosis, investigations, and advice can be transferred directly into the official digital prescription.
        </div>
      </div>

      {/* Encounter Actions */}
      <div className={styles.actionsCard}>
        {existingPrescription ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--color-primary-soft)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)" }}>
            <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
              Prescription Issued (#{existingPrescription.verificationCode})
            </span>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onOpenPrescription}
            >
              <FileText size={13} aria-hidden="true" />
              <span>View / Edit Rx</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={onOpenPrescription}
          >
            <FileText size={15} aria-hidden="true" />
            <span>Author Digital Prescription</span>
          </button>
        )}

        {!isCompleted ? (
          <button
            type="button"
            className={styles.completeBtn}
            disabled={busy}
            onClick={() => void onCompleteConsultation()}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>Mark Consultation Completed</span>
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-success)", fontWeight: 700, padding: "4px 8px" }}>
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Consultation Completed &amp; Documented</span>
          </div>
        )}
      </div>
    </aside>
  );
}
