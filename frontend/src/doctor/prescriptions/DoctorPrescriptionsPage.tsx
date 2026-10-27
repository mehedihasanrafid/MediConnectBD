/**
 * Doctor digital prescriptions manager. Lists all prescriptions issued by the authenticated doctor
 * and allows editing or deleting within the 24-hour edit window (`isEditable === true`).
 */

import { Alert, EmptyState, Spinner } from "../../components/ui";
import { DoctorPrescriptionCard } from "./components/DoctorPrescriptionCard";
import styles from "./DoctorPrescriptionsPage.module.css";
import { useDoctorPrescriptions } from "./hooks/useDoctorPrescriptions";

export function DoctorPrescriptionsPage() {
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

  if (loading) return <Spinner label="Loading prescriptions…" />;

  return (
    <div className={`page ${styles.page}`}>
      <header className={`page-header ${styles.header}`}>
        <p className="eyebrow">Digital Prescriptions</p>
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
  );
}
