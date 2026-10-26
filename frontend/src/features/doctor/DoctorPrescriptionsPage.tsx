/**
 * Doctor digital prescriptions manager. Lists all prescriptions issued by the authenticated doctor
 * and allows editing or deleting within the 24-hour edit window (`isEditable === true`).
 */

import { useCallback, useEffect, useState } from "react";
import { prescriptionsApi } from "../../api/prescriptions";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import type { Prescription } from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDateTime } from "../../shared/utils/format";
import { PrescriptionEditorForm } from "./PrescriptionEditorForm";

export function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async () => {
    try {
      const result = await prescriptionsApi.listDoctorPrescriptions();
      setPrescriptions(result.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load your issued prescriptions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrescriptions();
  }, [loadPrescriptions]);

  async function handleDelete(prescriptionId: string) {
    setError(null);
    setNotice(null);
    try {
      await prescriptionsApi.remove(prescriptionId);
      setNotice("Prescription deleted.");
      await loadPrescriptions();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not delete prescription."));
    }
  }

  if (loading) return <Spinner label="Loading prescriptions…" />;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Issued prescriptions</h1>
        <p className="muted">
          Prescriptions remain editable and deletable for 24 hours after creation.
        </p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {prescriptions.length === 0 && (
        <EmptyState>
          You have not issued any prescriptions yet. Complete an appointment from your queue to
          write one.
        </EmptyState>
      )}

      {prescriptions.map((rx) => (
        <Card key={rx.id}>
          <div className="row space-between">
            <div>
              <h3>Diagnosis: {rx.diagnosis}</h3>
              <p className="muted small">
                Issued {formatDhakaDateTime(rx.createdAt)} · Code: {rx.verificationCode}
              </p>
            </div>
            <Badge tone={rx.isEditable ? "success" : "neutral"}>
              {rx.isEditable ? "Editable (within 24h)" : "Locked (24h elapsed)"}
            </Badge>
          </div>

          {editingId === rx.id ? (
            <PrescriptionEditorForm
              initialValues={{
                diagnosis: rx.diagnosis,
                medicines: rx.medicines,
                tests: rx.tests,
                advice: rx.advice,
              }}
              submitLabel="Save changes"
              onCancel={() => setEditingId(null)}
              onSubmit={async (values) => {
                await prescriptionsApi.update(rx.id, values);
                setEditingId(null);
                setNotice("Prescription updated.");
                await loadPrescriptions();
              }}
            />
          ) : (
            <>
              <table className="table" style={{ marginTop: "0.75rem" }}>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medicines.map((med, idx) => (
                    <tr key={`${rx.id}-m-${idx}`}>
                      <td>{med.name}</td>
                      <td>{med.dosage}</td>
                      <td>{med.frequency}</td>
                      <td>{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rx.tests.length > 0 && (
                <p className="small" style={{ marginTop: "0.5rem" }}>
                  <strong>Tests:</strong> {rx.tests.join(", ")}
                </p>
              )}
              {rx.advice && (
                <p className="small" style={{ marginTop: "0.25rem" }}>
                  <strong>Advice:</strong> {rx.advice}
                </p>
              )}

              {rx.isEditable && (
                <div className="row" style={{ marginTop: "0.75rem" }}>
                  <Button variant="secondary" onClick={() => setEditingId(rx.id)}>
                    Edit prescription
                  </Button>
                  <Button variant="danger" onClick={() => void handleDelete(rx.id)}>
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
