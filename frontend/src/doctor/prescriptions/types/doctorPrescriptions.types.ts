import type { Medicine, Prescription } from "../../../shared/types";

export interface PrescriptionFormValues {
  diagnosis: string;
  medicines: Medicine[];
  tests: string[];
  advice: string | null;
}

export interface DoctorPrescriptionsState {
  prescriptions: Prescription[];
  loading: boolean;
  error: string | null;
  notice: string | null;
}
