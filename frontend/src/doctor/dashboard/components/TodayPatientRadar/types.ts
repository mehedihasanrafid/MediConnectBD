import type { DoctorAppointment, Prescription } from "../../../../shared/types";

export type RadarModeFilter = "ALL" | "VIDEO" | "CHAMBER" | "COMPLETED";

export interface TodayPatientRadarProps {
  appointments: DoctorAppointment[];
  prescriptions?: Prescription[];
  onInspectPatientHistory: (patientProfileId: string) => void;
  onOpenIssuePrescription?: (appointment: DoctorAppointment) => void;
  onAppointmentUpdated?: () => void;
}
