/**
 * Issue Digital E-Prescription Modal.
 * Enables doctors to author, customize with Fast-RX presets, autocomplete medicines,
 * review a live document preview, and issue authoritative prescriptions directly from
 * the clinical workspace and queue.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileSignature,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { appointmentsApi } from "../../../../api/appointments";
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
import { ConfirmCompletionDialog } from "../../../appointments/components/ConfirmCompletionDialog";
import styles from "./IssuePrescriptionModal.module.css";

interface IssuePrescriptionModalProps {
  appointment: DoctorAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onPrescriptionIssued: (rx: Prescription) => void;
  initialBundle?: FastRxBundle | null;
  onAppointmentCompleted?: () => void;
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
  onAppointmentCompleted,
}: IssuePrescriptionModalProps) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"EDIT" | "PREVIEW">("EDIT");
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([createDefaultMedicine()]);
  const [testsInput, setTestsInput] = useState("");
  const [advice, setAdvice] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live autocomplete state for medicines
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);

  // Fast-RX overwrite confirmation state
  const [pendingBundle, setPendingBundle] = useState<FastRxBundle | null>(null);

  // Explicit completion state
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const currentStatus = localStatus || appointment?.status;
  const isEncounterCompleted = currentStatus === "COMPLETED";

  const applyBundle = useCallback(
    (bundle: FastRxBundle, notify = true) => {
      setDiagnosis(bundle.diagnosis);
      setMedicines(
        bundle.medicines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
        })),
      );
      setTestsInput(bundle.tests ? bundle.tests.join(", ") : "");
      setAdvice(bundle.advice || "");
      setPendingBundle(null);

      if (notify) {
        playChimeSound("notification");
        showToast(`Applied clinical protocol preset: ${bundle.title}`, { kind: "info" });
      }
    },
    [showToast],
  );

  // Initialize or re-populate when modal opens or bundle changes
  useEffect(() => {
    if (!isOpen) {
      setPendingBundle(null);
      setLocalStatus(null);
      setShowCompleteConfirm(false);
      return;
    }

    setError(null);
    setActiveTab("EDIT");

    // 1. If explicit initialBundle passed
    if (initialBundle) {
      applyBundle(initialBundle, false);
      return;
    }

    // 2. Start with defaults (in-memory only, no sensitive clinical data in localStorage)
    setDiagnosis("");
    setMedicines([createDefaultMedicine()]);
    setTestsInput("");
    setAdvice("");
  }, [isOpen, initialBundle, applyBundle]);

  if (!isOpen || !appointment) return null;

  function handleSelectPreset(bundle: FastRxBundle) {
    const hasData = Boolean(
      diagnosis.trim() ||
      (medicines.length > 0 && medicines[0].name.trim()) ||
      advice.trim() ||
      testsInput.trim()
    );

    if (hasData) {
      setPendingBundle(bundle);
    } else {
      applyBundle(bundle, true);
    }
  }

  function handleAddMedicine() {
    setMedicines((prev) => [...prev, createDefaultMedicine()]);
  }

  function handleRemoveMedicine(index: number) {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
    if (activeSuggestionIndex === index) {
      setActiveSuggestionIndex(null);
    }
  }

  function handleUpdateMedicine(index: number, field: keyof Medicine, value: string) {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (field === "name") {
      if (value.trim().length >= 2) {
        setActiveSuggestionIndex(index);
        prescriptionsApi
          .suggestMedicines(value.trim())
          .then((res) => setSuggestions(res.items))
          .catch(() => setSuggestions([]));
      } else {
        setSuggestions([]);
        setActiveSuggestionIndex(null);
      }
    }
  }

  function handleSelectSuggestion(index: number, sug: MedicineSuggestion) {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        name: sug.name,
        dosage: sug.dosage || updated[index].dosage,
        frequency: sug.frequency || updated[index].frequency,
      };
      return updated;
    });
    setSuggestions([]);
    setActiveSuggestionIndex(null);
  }

  const patientName = appointment.familyMember?.name || (appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : "Patient Visit");

  const scheduledTimeStr = formatDhakaTime(appointment.scheduledStartAt);

  const handleExplicitComplete = async () => {
    if (!appointment || isCompleting) return;
    setIsCompleting(true);
    setError(null);
    try {
      await appointmentsApi.completeAppointment(appointment.id);
      setLocalStatus("COMPLETED");
      setShowCompleteConfirm(false);
      playChimeSound("complete");
      showToast("Consultation encounter marked completed. You can now issue the prescription.", {
        kind: "success",
      });
      onAppointmentCompleted?.();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not mark consultation as completed."));
      throw caught;
    } finally {
      setIsCompleting(false);
    }
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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

    if (!isEncounterCompleted) {
      setError("Complete the consultation before issuing a prescription.");
      return;
    }

    const parsedTests = testsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setBusy(true);

    try {
      // Issue authoritative prescription (requires COMPLETED appointment per backend contract)
      const created = await prescriptionsApi.create({
        appointmentId: appointment.id,
        diagnosis: trimmedDiagnosis,
        medicines: cleanedMedicines,
        tests: parsedTests.length > 0 ? parsedTests : undefined,
        advice: advice.trim() || null,
      });

      playChimeSound("complete");
      showToast(`Prescription #${created.verificationCode} issued successfully!`, {
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

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div style={{ display: "inline-flex", background: "var(--color-surface-sunken)", padding: "2px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
              <button
                type="button"
                style={{
                  padding: "4px 10px",
                  fontSize: "var(--text-xs)",
                  fontWeight: activeTab === "EDIT" ? 700 : 500,
                  borderRadius: "var(--radius-sm)",
                  background: activeTab === "EDIT" ? "var(--color-surface)" : "transparent",
                  color: activeTab === "EDIT" ? "var(--color-primary)" : "var(--color-text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("EDIT")}
              >
                Authoring Form
              </button>
              <button
                type="button"
                style={{
                  padding: "4px 10px",
                  fontSize: "var(--text-xs)",
                  fontWeight: activeTab === "PREVIEW" ? 700 : 500,
                  borderRadius: "var(--radius-sm)",
                  background: activeTab === "PREVIEW" ? "var(--color-surface)" : "transparent",
                  color: activeTab === "PREVIEW" ? "var(--color-primary)" : "var(--color-text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab("PREVIEW")}
              >
                <Eye size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Document Preview
              </button>
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
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <Alert kind="error">{error}</Alert>}

          {/* Explicit completion notice when appointment is not completed */}
          {!isEncounterCompleted && (
            <Alert kind="warning">
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontWeight: 700 }}>
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>Complete the consultation before issuing a prescription.</span>
                </div>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  Under MediConnectBD clinical policy and backend rules, an appointment must be formally completed before an official digital prescription can be issued.
                </p>
                <div>
                  <button
                    type="button"
                    disabled={isCompleting || busy}
                    onClick={() => setShowCompleteConfirm(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      fontSize: "var(--text-xs)",
                      fontWeight: 700,
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-primary)",
                      background: "var(--color-primary-soft)",
                      color: "var(--color-primary)",
                      cursor: "pointer",
                    }}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>Complete Consultation Encounter…</span>
                  </button>
                </div>
              </div>
            </Alert>
          )}

          {/* Preset overwrite warning banner */}
          {pendingBundle && (
            <Alert kind="warning">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
                  <span>
                    Apply protocol <strong>{pendingBundle.title}</strong>? This will replace your current entries.
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    style={{ padding: "4px 8px", fontSize: "var(--text-xs)", cursor: "pointer", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
                    onClick={() => setPendingBundle(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{ padding: "4px 8px", fontSize: "var(--text-xs)", fontWeight: 700, cursor: "pointer", borderRadius: "var(--radius-sm)", border: "none", background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                    onClick={() => applyBundle(pendingBundle, true)}
                  >
                    Confirm Replace
                  </button>
                </div>
              </div>
            </Alert>
          )}

          {activeTab === "EDIT" ? (
            <>
              {/* Fast-RX Template Ribbon */}
              <div className={styles.presetRibbon}>
                <div className={styles.presetRibbonHeader}>
                  <span className={styles.presetRibbonTitle}>
                    <Sparkles size={13} aria-hidden="true" />
                    <span>Fast-RX Protocol Templates (WHO &amp; BD Clinical Guidelines)</span>
                  </span>
                </div>
                <div className={styles.presetPills}>
                  {FAST_RX_PRESET_BUNDLES.map((bundle) => (
                    <button
                      key={bundle.id}
                      type="button"
                      className={styles.presetPill}
                      onClick={() => handleSelectPreset(bundle)}
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
            </>
          ) : (
            /* Document Preview Tab */
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-4)", background: "var(--color-surface-sunken)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-3)" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700, color: "var(--color-text)" }}>MediConnectBD Digital Prescription</h3>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Encounter: #{appointment.id.slice(0, 10)} • Status: Unissued Review Draft</span>
                </div>
                <span style={{ padding: "3px 8px", background: "var(--color-primary-soft)", color: "var(--color-primary)", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: 700 }}>
                  Pre-Issuance Preview
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", fontSize: "var(--text-xs)" }}>
                <div>
                  <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 700 }}>Patient Name</span>
                  <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "var(--text-sm)" }}>{patientName}</div>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 700 }}>Consultation Mode</span>
                  <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "var(--text-sm)" }}>
                    {appointment.mode === "VIDEO" ? "Telehealth Video" : "In-Person Chamber"}
                  </div>
                </div>
              </div>

              <div style={{ padding: "var(--space-3)", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 700 }}>Diagnosis</span>
                <div style={{ fontWeight: 700, color: "var(--color-primary)", marginTop: "2px" }}>
                  {diagnosis.trim() || <em style={{ color: "var(--color-text-muted)" }}>Not specified yet</em>}
                </div>
              </div>

              <div>
                <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 700 }}>Rx Prescriptions</span>
                <div style={{ marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {medicines.filter((m) => m.name.trim()).length === 0 ? (
                    <em style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>No medicines configured yet.</em>
                  ) : (
                    medicines
                      .filter((m) => m.name.trim())
                      .map((m, idx) => (
                        <div key={idx} style={{ padding: "8px 12px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--text-xs)" }}>
                          <div>
                            <strong>{idx + 1}. {m.name}</strong> <span style={{ color: "var(--color-text-muted)" }}>({m.dosage})</span>
                          </div>
                          <div style={{ color: "var(--color-text-secondary)" }}>
                            {m.frequency} • {m.duration}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {testsInput.trim() && (
                <div>
                  <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 700 }}>Diagnostic Investigations</span>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text)", marginTop: "4px" }}>
                    {testsInput}
                  </div>
                </div>
              )}

              {advice.trim() && (
                <div>
                  <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 700 }}>Physician Advice</span>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text)", marginTop: "4px", whiteSpace: "pre-wrap" }}>
                    {advice}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer inside form so submit triggers cleanly */}
          <div className={styles.modalFooter}>
            <div className={styles.footerLeft}>
              <ShieldCheck size={16} aria-hidden="true" color="var(--color-primary)" />
              <span>Official prescription with doctor BMDC seal / registration number, unique verification code and QR lookup link.</span>
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
                disabled={busy || !isEncounterCompleted}
                title={!isEncounterCompleted ? "Complete the consultation before issuing a prescription." : undefined}
              >
                {busy ? (
                  <>
                    <Spinner size="sm" />
                    <span>Issuing Prescription…</span>
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

      <ConfirmCompletionDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        appointment={appointment}
        onConfirmComplete={handleExplicitComplete}
      />
    </div>
  );
}
