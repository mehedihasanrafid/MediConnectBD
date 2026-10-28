/**
 * Patient digital prescriptions list. Displays diagnosis, prescribed medicines, recommended tests,
 * advice, and the 16-character verification code, with a print/PDF option.
 */

import { useEffect, useState } from "react";
import { prescriptionsApi } from "../../api/prescriptions";
import { Alert, Badge, Button, ButtonLink, Card, Cluster, EmptyState, Page, PageHeader, Spinner, Table, Text } from "../../shared/ui";
import type { Prescription } from "../../shared/types";
import { formatDhakaDateTime } from "../../shared/utils/format";
import styles from "./PatientPrescriptionsPage.module.css";

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
    <Page>
      <PageHeader
        eyebrow="Patient Health Records"
        title="My prescriptions"
        description="Digital prescriptions issued after your completed consultations."
      />

      {error && <Alert kind="error">{error}</Alert>}
      {prescriptions.length === 0 && !error && (
        <EmptyState>No prescriptions have been issued to your account yet.</EmptyState>
      )}

      {prescriptions.map((rx) => (
        <Card key={rx.id} className={styles.card}>
          <Cluster justify="between">
            <div>
              <h3>Diagnosis: {rx.diagnosis}</h3>
              <Text tone="muted" size="sm">Issued {formatDhakaDateTime(rx.createdAt)}</Text>
            </div>
            <Badge tone="info">Code: {rx.verificationCode}</Badge>
          </Cluster>

          <div>
            <h4 className={styles.subheading}>Prescribed medicines</h4>
            <div className={styles.tableWrapper}>
              <Table>
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
              </Table>
            </div>
          </div>

          {rx.tests.length > 0 && (
            <Text size="sm" className={styles.extraInfo}>
              <strong>Recommended tests:</strong> {rx.tests.join(", ")}
            </Text>
          )}

          {rx.advice && (
            <Text size="sm" className={styles.extraInfo}>
              <strong>Advice:</strong> {rx.advice}
            </Text>
          )}

          <Cluster gap={2} className={styles.actions}>
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
            <ButtonLink
              variant="secondary"
              to={`/verify-prescription?code=${encodeURIComponent(rx.verificationCode)}`}
            >
              Verify code
            </ButtonLink>
          </Cluster>
        </Card>
      ))}
    </Page>
  );
}
