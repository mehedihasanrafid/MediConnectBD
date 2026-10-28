/**
 * Inline panel allowing a doctor to inspect a patient's clinical history (past visits, previous
 * prescriptions, and uploaded medical reports) before or during a consultation.
 */

import { useEffect, useState } from "react";

import { doctorsApi } from "../../../../api/doctors";
import { reportsApi } from "../../../../api/reports";
import { Alert, Badge, Button, EmptyState, Spinner, Table } from "../../../../shared/ui";
import type { DoctorPatientHistory } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatDhakaDateTime, formatStatus } from "../../../../shared/utils/format";
import styles from "./PatientHistoryPanel.module.css";

export function PatientHistoryPanel({
  patientProfileId,
  onClose,
}: {
  patientProfileId: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<DoctorPatientHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void doctorsApi
      .getPatientHistory(patientProfileId)
      .then((res) => {
        if (!cancelled) setHistory(res);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(getErrorMessage(caught, "Could not load patient clinical history."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientProfileId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Patient clinical history & uploaded reports</h4>
        <Button variant="secondary" onClick={onClose}>
          Close history
        </Button>
      </div>

      {loading && <Spinner label="Loading patient clinical history…" />}
      {error && <Alert kind="error">{error}</Alert>}

      {history && (
        <div className={styles.historyContent}>
          <p className={styles.patientMeta}>
            Patient: <strong>{history.patient.firstName} {history.patient.lastName}</strong> ·{" "}
            Sex: {history.patient.sex}
            {history.patient.dateOfBirth ? ` · DOB: ${history.patient.dateOfBirth}` : ""}
            {history.patient.phone ? ` · Phone: ${history.patient.phone}` : ""}
          </p>

          <div>
            <div className={styles.sectionTitle}>Uploaded Medical Reports ({history.reports.length})</div>
            {history.reports.length === 0 ? (
              <EmptyState>No medical reports uploaded by this patient.</EmptyState>
            ) : (
              <div className={styles.tableWrapper}>
                <Table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>File</th>
                      <th>Notes</th>
                      <th>Uploaded</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.reports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.title}</td>
                        <td>{report.fileName}</td>
                        <td>{report.notes ?? "—"}</td>
                        <td>{formatDhakaDateTime(report.createdAt)}</td>
                        <td>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              void reportsApi
                                .downloadReport(report.id)
                                .catch((caught) =>
                                    setError(getErrorMessage(caught, "Could not download report.")),
                                  );
                            }}
                          >
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <div className={styles.sectionTitle}>Previous Prescriptions ({history.prescriptions.length})</div>
            {history.prescriptions.length === 0 ? (
              <EmptyState>No previous prescriptions on record.</EmptyState>
            ) : (
              <div className={styles.tableWrapper}>
                <Table>
                  <thead>
                    <tr>
                      <th>Issued</th>
                      <th>Diagnosis</th>
                      <th>Medicines</th>
                      <th>Advice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.prescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td>{formatDhakaDateTime(rx.createdAt)}</td>
                        <td>{rx.diagnosis}</td>
                        <td>
                          {rx.medicines.map((m) => `${m.name} (${m.dosage})`).join(", ")}
                        </td>
                        <td>{rx.advice ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <div className={styles.sectionTitle}>Past & Upcoming Visits ({history.visits.length})</div>
            <div className={styles.tableWrapper}>
              <Table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Doctor</th>
                    <th>Mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.visits.map((v) => (
                    <tr key={v.id}>
                      <td>{formatDhakaDateTime(v.scheduledStartAt)}</td>
                      <td>{v.doctorName ?? "Doctor"}</td>
                      <td>{v.mode}</td>
                      <td>
                        <Badge tone="neutral">{formatStatus(v.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
