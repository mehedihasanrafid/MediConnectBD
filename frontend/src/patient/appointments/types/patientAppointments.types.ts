import type { Appointment, Review } from "../../../shared/types";

export interface PatientAppointmentsState {
  appointments: Appointment[];
  reviewsByAppointment: Record<string, Review>;
  loading: boolean;
  error: string | null;
  notice: string | null;
}
