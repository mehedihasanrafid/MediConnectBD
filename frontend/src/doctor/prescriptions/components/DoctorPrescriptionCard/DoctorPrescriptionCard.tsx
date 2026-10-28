import { useState } from "react";

import { prescriptionsApi } from "../../../../api/prescriptions";
import { Badge, Button, Card, Cluster, Table, Text } from "../../../../shared/ui";
import type { Prescription } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatDhakaDateTime } from "../../../../shared/utils/format";
import { PrescriptionEditorForm } from "../PrescriptionEditorForm";
import styles from "./DoctorPrescriptionCard.module.css";

interface DoctorPrescriptionCardProps {
  rx: Prescription;
  onUpdated: () => Promise<void>;
  onDelete: (prescriptionId: string) => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

/**
 * Renders one issued prescription card with inline editing (within 24h) and PDF download.
 */
export function DoctorPrescriptionCard({
  rx,
  onUpdated,
  onDelete,
  onError,
  onNotice,
}: DoctorPrescriptionCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Diagnosis: {rx.diagnosis}</h3>
          <Text tone="muted" size="sm">
            Issued {formatDhakaDateTime(rx.createdAt)} · Code: {rx.verificationCode}
          </Text>
        </div>
        <Badge tone={rx.isEditable ? "success" : "neutral"}>
          {rx.isEditable ? "Editable (within 24h)" : "Locked (24h elapsed)"}
        </Badge>
      </div>

      {editing ? (
        <PrescriptionEditorForm
          initialValues={{
            diagnosis: rx.diagnosis,
            medicines: rx.medicines,
            tests: rx.tests,
            advice: rx.advice,
          }}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await prescriptionsApi.update(rx.id, values);
            setEditing(false);
            onNotice("Prescription updated.");
            await onUpdated();
          }}
        />
      ) : (
        <>
          <div className={styles.medicinesList}>
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
                {rx.medicines.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{m.name}</strong>
                    </td>
                    <td>{m.dosage}</td>
                    <td>{m.frequency}</td>
                    <td>{m.duration}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {rx.tests.length > 0 && (
            <Text size="sm" className={styles.extraInfo}>
              <strong>Tests:</strong> {rx.tests.join(", ")}
            </Text>
          )}

          {rx.advice && (
            <Text tone="muted" size="sm" className={styles.extraInfo}>
              <strong>Advice:</strong> {rx.advice}
            </Text>
          )}

          <Cluster gap={2} className={styles.actions}>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await prescriptionsApi.downloadPdf(rx.id, rx.verificationCode);
                } catch (caught) {
                  onError(getErrorMessage(caught, "Could not download prescription PDF."));
                }
              }}
            >
              Download official PDF
            </Button>
            {rx.isEditable && (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit prescription
                </Button>
                <Button variant="danger" onClick={() => void onDelete(rx.id)}>
                  Delete prescription
                </Button>
              </>
            )}
          </Cluster>
        </>
      )}
    </Card>
  );
}
