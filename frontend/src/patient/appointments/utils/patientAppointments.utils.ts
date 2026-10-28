import type { Appointment } from "../../../shared/types";
export { appointmentStatusTone } from "../../../shared/utils/statusTone";

/**
 * Checks whether an appointment can still be cancelled by the patient.
 */
export function isAppointmentCancellable(appointment: Appointment): boolean {
  return appointment.status === "CONFIRMED" || appointment.status === "PENDING_PAYMENT";
}

/**
 * Segregates appointments into active/upcoming and completed/past visits.
 */
export function partitionAppointments(appointments: Appointment[]): {
  upcoming: Appointment[];
  past: Appointment[];
} {
  const upcoming = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );
  const past = appointments.filter(
    (a) => a.status !== "CONFIRMED" && a.status !== "PENDING_PAYMENT",
  );
  return { upcoming, past };
}
