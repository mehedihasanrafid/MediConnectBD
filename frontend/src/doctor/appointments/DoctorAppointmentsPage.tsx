/**
 * Doctor appointment queue: manages upcoming and completed consultations, with one-click
 * transitions (complete / no-show / cancel), WebRTC video room entry, patient clinical history & reports
 * inspection, and inline post-visit prescription authoring.
 */

import { Alert, EmptyState, Page, PageHeader, Spinner } from "../../shared/ui";
import { ActiveAppointmentCard } from "./components/ActiveAppointmentCard";
import { PastAppointmentCard } from "./components/PastAppointmentCard";
import styles from "./DoctorAppointmentsPage.module.css";
import { useDoctorQueue } from "./hooks/useDoctorQueue";

export function DoctorAppointmentsPage() {
  const {
    appointments,
    prescriptionsByAppt,
    loading,
    error,
    notice,
    busyId,
    handleTransition,
    registerCreatedPrescription,
  } = useDoctorQueue();

  if (loading) return <Spinner label="Loading appointments…" />;

  const active = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );
  const past = appointments.filter(
    (a) => a.status !== "CONFIRMED" && a.status !== "PENDING_PAYMENT",
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Doctor Workspace"
        title="Patient appointment queue"
        description="All consultation times shown in Asia/Dhaka."
      />

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <h2 className={styles.sectionTitle}>Active & Upcoming consultations ({active.length})</h2>
      {active.length === 0 && <EmptyState>No active appointments scheduled.</EmptyState>}
      {active.map((appt) => (
        <ActiveAppointmentCard
          key={appt.id}
          appt={appt}
          busy={busyId === appt.id}
          onTransition={handleTransition}
        />
      ))}

      <h2 className={styles.sectionTitle}>Completed & Past consultations ({past.length})</h2>
      {past.length === 0 && <EmptyState>No past appointments.</EmptyState>}
      {past.map((appt) => (
        <PastAppointmentCard
          key={appt.id}
          appt={appt}
          existingRx={prescriptionsByAppt[appt.id]}
          onPrescriptionCreated={registerCreatedPrescription}
        />
      ))}
    </Page>
  );
}
