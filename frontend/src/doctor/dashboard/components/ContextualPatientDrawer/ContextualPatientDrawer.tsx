import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, History, X } from "lucide-react";
import { doctorsApi } from "../../../../api/doctors";
import { reportsApi } from "../../../../api/reports";
import type { DoctorPatientHistory } from "../../../../shared/types";
import { Alert, Badge, EmptyState, Spinner } from "../../../../shared/ui";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatDhakaDateTime, formatStatus } from "../../../../shared/utils/format";
import styles from "./ContextualPatientDrawer.module.css";

interface ContextualPatientDrawerProps {
  patientProfileId: string | null;
  onClose: () => void;
}

export function ContextualPatientDrawer({
  patientProfileId,
  onClose,
}: ContextualPatientDrawerProps) {
  const [history, setHistory] = useState<DoctorPatientHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientProfileId) {
      setHistory(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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

  if (!patientProfileId) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrap}>
              <FileSpreadsheet size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="drawer-title" className={styles.drawerTitle}>
                Patient Clinical Inspector
              </h2>
              <p className={styles.drawerSubtitle}>
                Vitals, lab reports, previous prescriptions &amp; visits
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close patient inspector"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.drawerBody}>
          {loading && <Spinner label="Loading clinical records…" />}
          {error && <Alert kind="error">{error}</Alert>}

          {history && (
            <>
              {/* Demographics Card */}
              <div className={styles.patientMetaCard}>
                <div className={styles.patientNameRow}>
                  <span>
                    {history.patient.firstName} {history.patient.lastName}
                  </span>
                  <Badge tone="neutral">{history.patient.sex || "N/A"}</Badge>
                </div>

                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>Phone</span>
                    <span className={styles.metaVal}>{history.patient.phone || "—"}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>Date of Birth</span>
                    <span className={styles.metaVal}>{history.patient.dateOfBirth || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Lab Reports */}
              <div className={styles.sectionHeader}>
                <FileSpreadsheet size={14} aria-hidden="true" />
                <span>Uploaded Medical Reports ({history.reports.length})</span>
              </div>

              {history.reports.length === 0 ? (
                <EmptyState>No lab reports uploaded by this patient yet.</EmptyState>
              ) : (
                <div className={styles.recordsList}>
                  {history.reports.map((report) => (
                    <div key={report.id} className={styles.recordCard}>
                      <div className={styles.recordTop}>
                        <span className={styles.recordTitle}>{report.title}</span>
                        <span className={styles.recordDate}>
                          {formatDhakaDateTime(report.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                        File: {report.fileName} {report.notes ? `• Notes: ${report.notes}` : ""}
                      </div>
                      <div>
                        <button
                          type="button"
                          className={styles.downloadBtn}
                          onClick={() => {
                            void reportsApi.downloadReport(report.id);
                          }}
                        >
                          <Download size={12} aria-hidden="true" />
                          <span>Download Report</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Previous Prescriptions */}
              <div className={styles.sectionHeader}>
                <FileText size={14} aria-hidden="true" />
                <span>Previous Prescriptions ({history.prescriptions.length})</span>
              </div>

              {history.prescriptions.length === 0 ? (
                <EmptyState>No previous digital prescriptions on record.</EmptyState>
              ) : (
                <div className={styles.recordsList}>
                  {history.prescriptions.map((rx) => (
                    <div key={rx.id} className={styles.recordCard}>
                      <div className={styles.recordTop}>
                        <span className={styles.recordTitle}>Dx: {rx.diagnosis}</span>
                        <span className={styles.recordDate}>
                          {formatDhakaDateTime(rx.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text)" }}>
                        <strong>Rx:</strong>{" "}
                        {rx.medicines.map((m) => `${m.name} (${m.dosage})`).join(", ")}
                      </div>
                      {rx.advice && (
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                          Advice: {rx.advice}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Past Visits */}
              <div className={styles.sectionHeader}>
                <History size={14} aria-hidden="true" />
                <span>Past Visit Logs ({history.visits.length})</span>
              </div>

              {history.visits.length === 0 ? (
                <EmptyState>No visit history on record.</EmptyState>
              ) : (
                <div className={styles.recordsList}>
                  {history.visits.map((v) => (
                    <div key={v.id} className={styles.recordCard}>
                      <div className={styles.recordTop}>
                        <span>{formatDhakaDateTime(v.scheduledStartAt)}</span>
                        <Badge tone="neutral">{formatStatus(v.status)}</Badge>
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                        Doctor: {v.doctorName || "Dr. Specialist"} • Mode: {v.mode}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
