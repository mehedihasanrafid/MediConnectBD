/**
 * Issue Digital E-Prescription Modal.
 * Enables doctors to author, customize with Fast-RX presets, autocomplete medicines,
 * and digitally sign e-prescriptions directly from the clinical dashboard queue.
 */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileSignature,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { prescriptionsApi } from "../../../../api/prescriptions";
import { Alert, Spinner } from "../../../../shared/ui";
import { useToast } from "../../../../shared/ui";
import type {
  DoctorAppointment,
  Medicine,
  MedicineSuggestion,
  Prescription,
} from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatDhakaTime } from "../../../../shared/utils/format";
import { playChimeSound } from "../../../../shared/utils/sound";
import {
  FAST_RX_PRESET_BUNDLES,
  type FastRxBundle,
} from "../../data/fastRxPresets";
import styles from "./IssuePrescriptionModal.module.css";

interface IssuePrescriptionModalProps {
  appointment: DoctorAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onPrescriptionIssued: (rx: Prescription) => void;
  initialBundle?: FastRxBundle | null;
}

function createDefaultMedicine(): Medicine {
  return {
    name: "",
    dosage: "500mg",
    frequency: "1+0+1 (after meals)",
    duration: "5 days",
  };
}

export function IssuePrescriptionModal({
  appointment,
  isOpen,
  onClose,
  onPrescriptionIssued,
  initialBundle,
}: IssuePrescriptionModalProps) {
  const { showToast } = useToast();

  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([createDefaultMedicine()]);
  const [testsInput, setTestsInput] = useState("");
  const [advice, setAdvice] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live autocomplete state for medicines
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);

  // Initialize or re-populate when modal opens or bundle changes
  useEffect(() => {
    if (!isOpen) return;

    setError(null);

    // 1. If explicit initialBundle passed
    if (initialBundle) {
      applyBundle(initialBundle, false);
      return;
    }

    // 2. Check localStorage for draft
    try {
      const storedDraft = localStorage.getItem("mediconnect_rx_draft");
      if (storedDraft) {
        const parsed = JSON.parse(storedDraft) as FastRxBundle;
        if (parsed.diagnosis && parsed.medicines) {
          applyBundle(parsed, false);
          return;
        }
      }
    } catch {
      // fallback
    }

    // 3. Clean default state
    setDiagnosis("");
    setMedicines([createDefaultMedicine()]);
    setTestsInput("");
    setAdvice("");
  }, [isOpen, initialBundle]);

  if (!isOpen || !appointment) return null;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : "Patient Consultation";

  const scheduledTimeStr = formatDhakaTime(appointment.scheduledStartAt);

  function applyBundle(bundle: FastRxBundle, notify = true) {
    setDiagnosis(bundle.diagnosis);
    setMedicines(
      bundle.medicines.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
      })),
    );
    setAdvice(bundle.advice);
    setTestsInput(bundle.tests ? bundle.tests.join(", ") : "");

    if (notify) {
      showToast(`Applied preset: ${bundle.title}`, { kind: "info" });
    }
  }

  function handleAddMedicine() {
    setMedicines((prev) => [...prev, createDefaultMedicine()]);
  }

  function handleRemoveMedicine(index: number) {
    setMedicines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleUpdateMedicine(index: number, field: keyof Medicine, val: string) {
    setMedicines((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item)),
    );

    // If typing medicine name, trigger suggestion search
    if (field === "name") {
      if (val.trim().length >= 2) {
        setActiveSuggestionIndex(index);
        prescriptionsApi
          .suggestMedicines(val.trim())
          .then((res) => {
            setSuggestions(res.items || []);
          })
          .catch(() => {
            setSuggestions([]);
          });
      } else {
        setSuggestions([]);
        setActiveSuggestionIndex(null);
      }
    }
  }

  function handleSelectSuggestion(index: number, suggestion: MedicineSuggestion) {
    setMedicines((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              name: suggestion.name,
              dosage: suggestion.dosage || item.dosage,
              frequency: suggestion.frequency || item.frequency,
              duration: suggestion.duration || item.duration,
            }
          : item,
      ),
    );
    setSuggestions([]);
    setActiveSuggestionIndex(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appointment) return;
    setError(null);

    const trimmedDiagnosis = diagnosis.trim();
    const cleanedMedicines = medicines
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
      }))
      .filter((m) => m.name.length > 0);

    if (!trimmedDiagnosis) {
      setError("Clinical diagnosis is required.");
      return;
    }

    if (cleanedMedicines.length === 0) {
      setError("At least one medicine with a valid name is required.");
      return;
    }

    const parsedTests = testsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setBusy(true);

    try {
      const created = await prescriptionsApi.create({
        appointmentId: appointment.id,
        diagnosis: trimmedDiagnosis,
        medicines: cleanedMedicines,
        tests: parsedTests.length > 0 ? parsedTests : undefined,
        advice: advice.trim() || null,
      });

      // Clear draft
      try {
        localStorage.removeItem("mediconnect_rx_draft");
      } catch {
        // ignore
      }

      playChimeSound("complete");
      showToast(`Prescription #${created.verificationCode} issued and signed digitally!`, {
        kind: "success",
      });

      onPrescriptionIssued(created);
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not issue prescription."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-rx-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconWrap}>
              <FileSignature size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="issue-rx-title" className={styles.title}>
                Issue Digital E-Prescription
              </h2>
              <p className={styles.subtitle}>
                Patient: <strong>{patientName}</strong> • {scheduledTimeStr} •{" "}
                {appointment.mode === "VIDEO" ? "Telehealth Video" : "Chamber Visit"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={busy}
            aria-label="Close modal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <Alert kind="error">{error}</Alert>}

          {/* Fast-RX Template Ribbon */}
          <div className={styles.presetRibbon}>
            <div className={styles.presetRibbonHeader}>
              <span className={styles.presetRibbonTitle}>
                <Sparkles size={13} aria-hidden="true" />
                <span>Fast-RX Protocol Templates (WHO &amp; BD Guidelines)</span>
              </span>
            </div>
            <div className={styles.presetPills}>
              {FAST_RX_PRESET_BUNDLES.map((bundle) => (
                <button
                  key={bundle.id}
                  type="button"
                  className={styles.presetPill}
                  onClick={() => applyBundle(bundle)}
                  title={bundle.diagnosis}
                >
                  <Pill size={12} aria-hidden="true" />
                  <span>{bundle.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Clinical Diagnosis */}
          <div className={styles.formSection}>
            <label htmlFor="rx-diagnosis-input" className={styles.label}>
              Clinical Diagnosis *
            </label>
            <input
              id="rx-diagnosis-input"
              type="text"
              className={styles.textInput}
              placeholder="e.g. Acute Upper Respiratory Tract Infection"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
            />
          </div>

          {/* 2. Medicines Box */}
          <div className={styles.medicinesBox}>
            <div className={styles.medicinesHeader}>
              <span className={styles.label}>
                Prescribed Medicines ({medicines.length}) *
              </span>
              <button
                type="button"
                className={styles.addMedBtn}
                onClick={handleAddMedicine}
              >
                <Plus size={14} aria-hidden="true" />
                <span>Add Medicine</span>
              </button>
            </div>

            <div className={styles.medList}>
              {medicines.map((med, idx) => (
                <div key={idx} className={styles.medRow}>
                  {/* Name field with live autocomplete */}
                  <div className={styles.medFieldCol}>
                    <label className={styles.medFieldLabel}>Medicine Brand / Generic</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="e.g. Napa, Sergel, Comet"
                      value={med.name}
                      onChange={(e) => handleUpdateMedicine(idx, "name", e.target.value)}
                      required
                      autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {activeSuggestionIndex === idx && suggestions.length > 0 && (
                      <div className={styles.suggestionsDropdown}>
                        {suggestions.map((sug, sIdx) => (
                          <div
                            key={`${sug.name}-${sIdx}`}
                            className={styles.suggestionItem}
                            onMouseDown={() => handleSelectSuggestion(idx, sug)}
                          >
                            <span className={styles.suggestionName}>
                              {sug.name} ({sug.dosage})
                            </span>
                            <span className={styles.suggestionGeneric}>
                              {sug.genericName} • {sug.frequency}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.medFieldCol}>
                    <label className={styles.medFieldLabel}>Dosage</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="500mg"
                      value={med.dosage}
                      onChange={(e) => handleUpdateMedicine(idx, "dosage", e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.medFieldCol}>
                    <label className={styles.medFieldLabel}>Frequency / Timing</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="1+0+1 (after meals)"
                      value={med.frequency}
                      onChange={(e) => handleUpdateMedicine(idx, "frequency", e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.medFieldCol}>
                    <label className={styles.medFieldLabel}>Duration</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="5 days"
                      value={med.duration}
                      onChange={(e) => handleUpdateMedicine(idx, "duration", e.target.value)}
                      required
                    />
                  </div>

                  {medicines.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeMedBtn}
                      onClick={() => handleRemoveMedicine(idx)}
                      title="Remove medicine"
                      aria-label="Remove medicine"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Recommended Tests */}
          <div className={styles.formSection}>
            <label htmlFor="rx-tests-input" className={styles.label}>
              Recommended Diagnostic Tests (comma-separated, optional)
            </label>
            <input
              id="rx-tests-input"
              type="text"
              className={styles.textInput}
              placeholder="e.g. Complete Blood Count (CBC), Serum Creatinine, Fasting Blood Sugar"
              value={testsInput}
              onChange={(e) => setTestsInput(e.target.value)}
            />
          </div>

          {/* 4. Advice */}
          <div className={styles.formSection}>
            <label htmlFor="rx-advice-input" className={styles.label}>
              Clinical Advice &amp; Lifestyle Instructions (optional)
            </label>
            <textarea
              id="rx-advice-input"
              className={styles.textArea}
              placeholder="e.g. Drink warm fluids, avoid cold exposure, rest for 3 days."
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </div>

          {/* Footer inside form so submit triggers cleanly */}
          <div className={styles.modalFooter}>
            <div className={styles.footerLeft}>
              <ShieldCheck size={16} aria-hidden="true" color="var(--color-primary)" />
              <span>Digitally encrypted and verified with BMDC seal &amp; QR verification.</span>
            </div>

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Spinner size="sm" />
                    <span>Signing Prescription…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <span>Sign &amp; Issue Prescription</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
