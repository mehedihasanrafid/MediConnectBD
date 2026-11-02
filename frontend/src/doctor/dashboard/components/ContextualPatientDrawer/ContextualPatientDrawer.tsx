import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, History, ShieldAlert, X } from "lucide-react";
import { doctorsApi } from "../../../../api/doctors";
import { prescriptionsApi } from "../../../../api/prescriptions";
import { reportsApi } from "../../../../api/reports";
import type { DoctorPatientHistory } from "../../../../shared/types";
import { Alert, Badge, EmptyState, Spinner, useToast } from "../../../../shared/ui";
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
  const { showToast } = useToast();
  const [history, setHistory] = useState<DoctorPatientHistory | null>(null);
  const [loading, setLoading] = useState(Boolean(patientProfileId));
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "REPORTS" | "PRESCRIPTIONS" | "VISITS">("ALL");
  const [downloadingRxId, setDownloadingRxId] = useState<string | null>(null);

  useEffect(() => {
    // Immediately clear previous patient data to prevent any data leakage
    setHistory(null);
    setError(null);
    setActiveTab("ALL");

    if (!patientProfileId) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void doctorsApi
      .getPatientHistory(patientProfileId)
      .then((res) => {
        if (!cancelled) {
          setHistory(res);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          const msg = getErrorMessage(caught, "Could not load patient clinical history.");
          if (msg.includes("RELATIONSHIP_REQUIRED") || msg.includes("Only a doctor with an appointment")) {
            setError(
              "Clinical access restricted: Only a doctor with an active or confirmed consultation for this patient can access their historical medical records."
            );
          } else {
            setError(msg);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      // Immediate cleanup on unmount or patient ID switch
      setHistory(null);
    };
  }, [patientProfileId]);

  if (!patientProfileId) return null;

  const handleDownloadRx = async (rxId: string, verificationCode: string) => {
    setDownloadingRxId(rxId);
    try {
      showToast("Downloading prescription PDF…", { kind: "info" });
      await prescriptionsApi.downloadPdf(rxId, verificationCode);
      showToast("Prescription PDF downloaded successfully.", { kind: "success" });
    } catch {
      showToast("Could not download prescription PDF.", { kind: "error" });
    } finally {
      setDownloadingRxId(null);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      showToast("Downloading medical report…", { kind: "info" });
      await reportsApi.downloadReport(reportId);
      showToast("Medical report downloaded.", { kind: "success" });
    } catch {
      showToast("Could not download medical report.", { kind: "error" });
    }
  };

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
                Authorized Patient History
              </h2>
              <p className={styles.drawerSubtitle}>
                EHR records, prior prescriptions, lab reports &amp; consultations
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
          {loading && <Spinner label="Verifying authorization and loading clinical records…" />}
          {error && (
            <Alert kind="error">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
                <div>{error}</div>
              </div>
            </Alert>
          )}

          {history && (
            <>
              {/* Demographics & Clinical Profile */}
              <div className={styles.patientMetaCard}>
                <div className={styles.patientNameRow}>
                  <span>
                    {history.patient.firstName} {history.patient.lastName}
                  </span>
                  <Badge tone="neutral">{history.patient.sex || "Sex: N/A"}</Badge>
                </div>

                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>Phone</span>
                    <span className={styles.metaVal}>{history.patient.phone || "Not registered"}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>Date of Birth</span>
                    <span className={styles.metaVal}>{history.patient.dateOfBirth || "Not documented"}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>Recorded Allergies</span>
                    <span className={styles.metaVal} style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
                      Not documented in EHR
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>Treating Relationship</span>
                    <span className={styles.metaVal} style={{ color: "var(--color-success)" }}>
                      Verified Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: "flex", gap: "var(--space-1)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-2)" }}>
                <button
                  type="button"
                  style={{
                    padding: "4px 10px",
                    fontSize: "var(--text-xs)",
                    fontWeight: activeTab === "ALL" ? 700 : 500,
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--color-border)",
                    background: activeTab === "ALL" ? "var(--color-primary-soft)" : "transparent",
                    color: activeTab === "ALL" ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveTab("ALL")}
                >
                  All ({history.reports.length + history.prescriptions.length + history.visits.length})
                </button>
                <button
                  type="button"
                  style={{
                    padding: "4px 10px",
                    fontSize: "var(--text-xs)",
                    fontWeight: activeTab === "PRESCRIPTIONS" ? 700 : 500,
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--color-border)",
                    background: activeTab === "PRESCRIPTIONS" ? "var(--color-primary-soft)" : "transparent",
                    color: activeTab === "PRESCRIPTIONS" ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveTab("PRESCRIPTIONS")}
                >
                  Prescriptions ({history.prescriptions.length})
                </button>
                <button
                  type="button"
                  style={{
                    padding: "4px 10px",
                    fontSize: "var(--text-xs)",
                    fontWeight: activeTab === "REPORTS" ? 700 : 500,
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--color-border)",
                    background: activeTab === "REPORTS" ? "var(--color-primary-soft)" : "transparent",
                    color: activeTab === "REPORTS" ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveTab("REPORTS")}
                >
                  Lab Reports ({history.reports.length})
                </button>
                <button
                  type="button"
                  style={{
                    padding: "4px 10px",
                    fontSize: "var(--text-xs)",
                    fontWeight: activeTab === "VISITS" ? 700 : 500,
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--color-border)",
                    background: activeTab === "VISITS" ? "var(--color-primary-soft)" : "transparent",
                    color: activeTab === "VISITS" ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveTab("VISITS")}
                >
                  Visits ({history.visits.length})
                </button>
              </div>

              {/* Uploaded Lab Reports */}
              {(activeTab === "ALL" || activeTab === "REPORTS") && (
                <div>
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
                              onClick={() => handleDownloadReport(report.id)}
                            >
                              <Download size={12} aria-hidden="true" />
                              <span>Download File</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Previous Prescriptions */}
              {(activeTab === "ALL" || activeTab === "PRESCRIPTIONS") && (
                <div>
                  <div className={styles.sectionHeader}>
                    <FileText size={14} aria-hidden="true" />
                    <span>Previous Digital Prescriptions ({history.prescriptions.length})</span>
                  </div>

                  {history.prescriptions.length === 0 ? (
                    <EmptyState>No previous digital prescriptions on record.</EmptyState>
                  ) : (
                    <div className={styles.recordsList}>
                      {history.prescriptions.map((rx) => (
                        <div key={rx.id} className={styles.recordCard}>
                          <div className={styles.recordTop}>
                            <span className={styles.recordTitle}>Diagnosis: {rx.diagnosis}</span>
                            <span className={styles.recordDate}>
                              {formatDhakaDateTime(rx.createdAt)}
                            </span>
                          </div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text)" }}>
                            <strong>Rx:</strong>{" "}
                            {rx.medicines.map((m) => `${m.name} (${m.dosage})`).join(", ")}
                          </div>
                          {rx.tests && rx.tests.length > 0 && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                              Tests: {rx.tests.join(", ")}
                            </div>
                          )}
                          {rx.advice && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                              Advice: {rx.advice}
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-1)" }}>
                            <button
                              type="button"
                              className={styles.downloadBtn}
                              disabled={downloadingRxId === rx.id}
                              onClick={() => handleDownloadRx(rx.id, rx.verificationCode)}
                            >
                              <Download size={12} aria-hidden="true" />
                              <span>Download Signed PDF (#{rx.verificationCode})</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Past Visits */}
              {(activeTab === "ALL" || activeTab === "VISITS") && (
                <div>
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
                            Doctor: {v.doctorName || "Treating Physician"} • Mode: {v.mode}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
