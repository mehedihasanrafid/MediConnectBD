import type { Appointment } from "../../../shared/types";

/**
 * Maps appointment status to UI badge tone.
 */
export function appointmentStatusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED" || status === "PAYMENT_EXPIRED" || status === "NO_SHOW") return "danger";
  return "neutral";
}

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
