/**
 * Patient appointment list showing upcoming and past visits with status, fee, online payment
 * checkout, inline cancellation with refund preview, and post-visit reviews.
 */

import { Alert, EmptyState, Page, PageHeader, Spinner } from "../../shared/ui";
import styles from "./AppointmentsPage.module.css";
import { PatientAppointmentCard } from "./components/PatientAppointmentCard";
import { usePatientAppointments } from "./hooks/usePatientAppointments";
import { partitionAppointments } from "./utils/patientAppointments.utils";

export function AppointmentsPage() {
  const {
    appointments,
    reviewsByAppointment,
    loading,
    error,
    loadAll,
    handleRescheduled,
    handleCancelled,
    handleReviewCreated,
  } = usePatientAppointments();

  if (loading) return <Spinner label="Loading appointments…" />;

  const { upcoming, past } = partitionAppointments(appointments);

  return (
    <Page>
      <PageHeader
        eyebrow="Patient Portal"
        title="My appointments"
        description="All times are shown in Bangladesh time (Asia/Dhaka)."
      />

      {error && <Alert kind="error">{error}</Alert>}

      <h2 className={styles.sectionTitle}>Active & Upcoming ({upcoming.length})</h2>
      {upcoming.length === 0 && <EmptyState>No active or upcoming appointments.</EmptyState>}
      {upcoming.map((appointment) => (
        <PatientAppointmentCard
          key={appointment.id}
          appointment={appointment}
          onPaymentUpdated={() => void loadAll()}
          onRescheduled={handleRescheduled}
          onCancelled={handleCancelled}
        />
      ))}

      <h2 className={styles.sectionTitle}>Completed & Past ({past.length})</h2>
      {past.length === 0 && <EmptyState>No past appointments.</EmptyState>}
      {past.map((appointment) => (
        <PatientAppointmentCard
          key={appointment.id}
          appointment={appointment}
          existingReview={reviewsByAppointment[appointment.id]}
          onReviewCreated={handleReviewCreated}
        />
      ))}
    </Page>
  );
}
