import type { DoctorAppointment, Prescription } from "../../../shared/types";

export interface DoctorQueueState {
  queue: DoctorAppointment[];
  prescriptionsByAppointment: Record<string, Prescription>;
  loading: boolean;
  error: string | null;
  notice: string | null;
  busy: boolean;
}
