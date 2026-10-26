/**
 * Reusable form for creating or updating a digital prescription.
 * Supports multiple medicine rows, recommended tests, diagnosis, and advice.
 */

import { useState } from "react";
import { Alert, Button, Field } from "../../components/ui";
import type { Medicine } from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/apiError";

export interface PrescriptionFormValues {
  diagnosis: string;
  medicines: Medicine[];
  tests: string[];
  advice: string | null;
}

const EMPTY_MEDICINE: Medicine = {
  name: "",
  dosage: "500mg",
  frequency: "Twice daily",
  duration: "5 days",
};

export function PrescriptionEditorForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues?: PrescriptionFormValues;
  submitLabel: string;
  onSubmit: (values: PrescriptionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [diagnosis, setDiagnosis] = useState(initialValues?.diagnosis ?? "");
  const [medicines, setMedicines] = useState<Medicine[]>(
    initialValues?.medicines && initialValues.medicines.length > 0
      ? initialValues.medicines
      : [{ ...EMPTY_MEDICINE }],
  );
  const [testsInput, setTestsInput] = useState((initialValues?.tests ?? []).join(", "));
  const [advice, setAdvice] = useState(initialValues?.advice ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateMedicine(index: number, field: keyof Medicine, value: string) {
    setMedicines((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  }

  function addMedicineRow() {
    setMedicines((current) => [...current, { ...EMPTY_MEDICINE }]);
  }

  function removeMedicineRow(index: number) {
    setMedicines((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const cleanedMedicines = medicines
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
      }))
      .filter((m) => m.name.length > 0);

    if (!diagnosis.trim() || cleanedMedicines.length === 0) {
      setError("Diagnosis and at least one medicine are required.");
      return;
    }

    const tests = testsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setBusy(true);
    try {
      await onSubmit({
        diagnosis: diagnosis.trim(),
        medicines: cleanedMedicines,
        tests,
        advice: advice.trim() || null,
      });
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not save prescription."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="page" style={{ marginTop: "0.75rem" }}>
      {error && <Alert kind="error">{error}</Alert>}

      <Field
        label="Clinical diagnosis"
        value={diagnosis}
        onChange={setDiagnosis}
        placeholder="e.g. Acute viral pharyngitis"
        required
      />

      <div>
        <div className="row space-between" style={{ marginBottom: "0.5rem" }}>
          <span className="small muted">Medicines ({medicines.length})</span>
          <Button variant="secondary" onClick={addMedicineRow}>
            + Add medicine
          </Button>
        </div>
        {medicines.map((med, idx) => (
          <div key={idx} className="filters" style={{ marginBottom: "0.5rem" }}>
            <Field
              label="Medicine name"
              value={med.name}
              onChange={(v) => updateMedicine(idx, "name", v)}
              placeholder="e.g. Paracetamol"
              required
            />
            <Field
              label="Dosage"
              value={med.dosage}
              onChange={(v) => updateMedicine(idx, "dosage", v)}
              placeholder="500mg"
              required
            />
            <Field
              label="Frequency"
              value={med.frequency}
              onChange={(v) => updateMedicine(idx, "frequency", v)}
              placeholder="Every 8 hours"
              required
            />
            <Field
              label="Duration"
              value={med.duration}
              onChange={(v) => updateMedicine(idx, "duration", v)}
              placeholder="5 days"
              required
            />
            {medicines.length > 1 && (
              <Button variant="danger" onClick={() => removeMedicineRow(idx)}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="filters">
        <Field
          label="Recommended tests (comma-separated, optional)"
          value={testsInput}
          onChange={setTestsInput}
          placeholder="CBC, Chest X-Ray"
        />
        <Field
          label="Doctor's advice (optional)"
          value={advice}
          onChange={setAdvice}
          placeholder="Drink warm fluids and rest for 3 days"
        />
      </div>

      <div className="row">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
