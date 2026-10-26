/**
 * Types for the prescription system.
 */

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionView {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  doctorProfileId: string;
  diagnosis: string;
  medicines: Medicine[];
  tests: string[];
  advice: string | null;
  verificationCode: string;
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePrescriptionInput {
  appointmentId: string;
  diagnosis: string;
  medicines: Medicine[];
  tests?: string[] | undefined;
  advice?: string | null | undefined;
}

export interface UpdatePrescriptionInput {
  diagnosis?: string | undefined;
  medicines?: Medicine[] | undefined;
  tests?: string[] | undefined;
  advice?: string | null | undefined;
}

export type CreatePrescriptionResult =
  | { kind: "CREATED"; prescription: PrescriptionView }
  | { kind: "APPOINTMENT_NOT_FOUND" }
  | { kind: "APPOINTMENT_NOT_COMPLETED" }
  | { kind: "ALREADY_HAS_PRESCRIPTION" }
  | { kind: "DOCTOR_FORBIDDEN" };

export type UpdatePrescriptionResult =
  | { kind: "UPDATED"; prescription: PrescriptionView }
  | { kind: "PRESCRIPTION_NOT_FOUND" }
  | { kind: "PRESCRIPTION_NOT_EDITABLE" }
  | { kind: "DOCTOR_FORBIDDEN" };

export interface DeletePrescriptionResult {
  success: boolean;
}

export interface VerifyPrescriptionResult {
  valid: boolean;
  prescription: PrescriptionView | null;
}
