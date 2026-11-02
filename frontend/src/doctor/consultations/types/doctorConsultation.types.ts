import type { Medicine } from "../../../shared/types";

export interface EncounterClinicalNotes {
  chiefComplaint: string;
  clinicalFindings: string;
  diagnosis: string;
  medicines: Medicine[];
  tests: string[];
  advice: string;
}

export interface VitalsIntake {
  bpSystolic?: string;
  bpDiastolic?: string;
  pulse?: string;
  temperature?: string;
  weightKg?: string;
}

export type VideoEligibilityStatus =
  | "CHECKING"
  | "ELIGIBLE"
  | "TOO_EARLY"
  | "EXPIRED"
  | "NOT_CONFIRMED"
  | "ERROR";
