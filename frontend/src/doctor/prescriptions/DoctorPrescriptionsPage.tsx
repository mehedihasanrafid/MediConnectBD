/**
 * Doctor digital prescriptions manager. Lists all prescriptions issued by the authenticated doctor
 * and allows editing or deleting within the 24-hour edit window (`isEditable === true`).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Trash2 } from "lucide-react";

import { Alert, EmptyState, Page, PageHeader, Spinner } from "../../shared/ui";
import { useToast } from "../../shared/ui";
import { DoctorBreadcrumbs } from "../dashboard/components/DoctorBreadcrumbs";
import type { FastRxBundle } from "../dashboard/data/fastRxPresets";
import { DoctorPrescriptionCard } from "./components/DoctorPrescriptionCard";
import { useDoctorPrescriptions } from "./hooks/useDoctorPrescriptions";
import styles from "./DoctorPrescriptionsPage.module.css";

export function DoctorPrescriptionsPage() {
  const { showToast } = useToast();
  const {
    prescriptions,
    loading,
    error,
    setError,
    notice,
    setNotice,
    loadPrescriptions,
    handleDelete,
  } = useDoctorPrescriptions();

  const [activeDraft, setActiveDraft] = useState<FastRxBundle | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mediconnect_rx_draft");
      if (stored) {
        const parsed = JSON.parse(stored) as FastRxBundle;
        if (parsed.title && parsed.diagnosis) {
          setActiveDraft(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem("mediconnect_rx_draft");
    } catch {
      // ignore
    }
    setActiveDraft(null);
    showToast("Prescription protocol draft discarded.", { kind: "info" });
  };

  if (loading) return <Spinner label="Loading prescriptions…" />;

  return (
    <Page>
      <div className={styles.container}>
        <DoctorBreadcrumbs activeTabLabel="Issued Digital Prescriptions" />

        <PageHeader
          eyebrow="Digital Prescriptions"
          title="Issued Prescriptions"
          description="Prescriptions remain editable and deletable for 24 hours after creation. Each document contains an encrypted QR verification seal."
        />

        {activeDraft && (
          <div className={styles.draftBanner} role="region" aria-label="Prescription draft in progress">
            <div className={styles.draftInfo}>
              <div className={styles.draftIconWrap}>
                <Sparkles size={18} aria-hidden="true" />
              </div>
              <div>
                <h4 className={styles.draftTitle}>
                  Fast-RX Draft Loaded: {activeDraft.title}
                </h4>
                <p className={styles.draftDiagnosis}>
                  Diagnosis: <strong>{activeDraft.diagnosis}</strong> ({activeDraft.medicines.length} medicines configured)
                </p>
              </div>
            </div>

            <div className={styles.draftActions}>
              <button
                type="button"
                className={styles.clearDraftBtn}
                onClick={handleClearDraft}
              >
                <Trash2 size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                <span>Discard Draft</span>
              </button>

              <Link to="/doctor" className={styles.applyDraftLink}>
                <span>Select Patient in Queue</span>
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}

        {error && <Alert kind="error">{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}

        {prescriptions.length === 0 && (
          <EmptyState>
            You have not issued any prescriptions yet. Complete an appointment from your queue to
            issue a signed prescription.
          </EmptyState>
        )}

        {prescriptions.map((rx) => (
          <DoctorPrescriptionCard
            key={rx.id}
            rx={rx}
            onUpdated={loadPrescriptions}
            onDelete={handleDelete}
            onError={setError}
            onNotice={setNotice}
          />
        ))}
      </div>
    </Page>
  );
}
