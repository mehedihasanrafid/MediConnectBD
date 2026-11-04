import type { DoctorAppointment } from "../../../shared/types";

export type PatientPanelKind = "details" | "records" | "tools" | "readiness" | "video" | "prescription" | "complete" | "cancel" | "no-show";
export interface PatientPanelSelection { appointmentId: string; kind: PatientPanelKind }
export type OpenPatientPanel = (appointment: DoctorAppointment, kind: PatientPanelKind) => void;
