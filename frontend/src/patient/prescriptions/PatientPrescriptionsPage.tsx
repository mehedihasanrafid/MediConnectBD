/**
 * Patient digital prescriptions list. Displays diagnosis, prescribed medicines, recommended tests,
 * advice, and the 16-character verification code, with a print/PDF option.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { prescriptionsApi } from "../../api/prescriptions";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import type { Prescription } from "../../shared/types";
import { formatDhakaDateTime } from "../../shared/utils/format";

export function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void prescriptionsApi
      .listPatientPrescriptions()
      .then((res) => {
        if (!cancelled) setPrescriptions(res.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your prescriptions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading prescriptions…" />;

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Patient Health Records</p>
        <h1>My prescriptions</h1>
        <p className="muted">Digital prescriptions issued after your completed consultations.</p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {prescriptions.length === 0 && !error && (
        <EmptyState>No prescriptions have been issued to your account yet.</EmptyState>
      )}

      {prescriptions.map((rx) => (
        <Card key={rx.id}>
          <div className="row space-between">
            <div>
              <h3>Diagnosis: {rx.diagnosis}</h3>
              <p className="muted small">Issued {formatDhakaDateTime(rx.createdAt)}</p>
            </div>
            <Badge tone="info">Code: {rx.verificationCode}</Badge>
          </div>

          <h4 style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.9rem" }}>Prescribed medicines</h4>
          <table className="table">
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
                <tr key={`${rx.id}-med-${idx}`}>
                  <td>{med.name}</td>
                  <td>{med.dosage}</td>
                  <td>{med.frequency}</td>
                  <td>{med.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {rx.tests.length > 0 && (
            <p className="small" style={{ marginTop: "0.75rem" }}>
              <strong>Recommended tests:</strong> {rx.tests.join(", ")}
            </p>
          )}

          {rx.advice && (
            <p className="small" style={{ marginTop: "0.5rem" }}>
              <strong>Advice:</strong> {rx.advice}
            </p>
          )}

          <div className="row" style={{ marginTop: "0.75rem" }}>
            <Button
              onClick={() => {
                void prescriptionsApi
                  .downloadPdf(rx.id, rx.verificationCode)
                  .catch(() => setError("Could not download prescription PDF."));
              }}
            >
              Download PDF
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
            <Link
              className="btn btn-secondary"
              to={`/verify-prescription?code=${encodeURIComponent(rx.verificationCode)}`}
            >
              Verify code
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
