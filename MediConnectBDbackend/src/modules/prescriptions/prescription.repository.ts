/**
 * Contract for prescription persistence operations. Result unions distinguish missing,
 * expired, conflicting, forbidden, and success outcomes so services can map them
 * without depending on MySQL errors.
 */

import type {
  CreatePrescriptionInput,
  CreatePrescriptionResult,
  DeletePrescriptionResult,
  PrescriptionPdfData,
  PrescriptionView,
  UpdatePrescriptionInput,
  UpdatePrescriptionResult,
  VerifyPrescriptionResult,
} from "./prescription.types";

export interface PrescriptionRepository {
  createPrescription(input: CreatePrescriptionInput, doctorProfileId: string): Promise<CreatePrescriptionResult>;
  getPatientPrescriptions(patientProfileId: string): Promise<PrescriptionView[]>;
  getDoctorPrescriptions(doctorProfileId: string): Promise<PrescriptionView[]>;
  getPrescriptionForPdf(prescriptionId: string): Promise<PrescriptionPdfData | null>;
  updatePrescription(prescriptionId: string, input: UpdatePrescriptionInput, doctorProfileId: string): Promise<UpdatePrescriptionResult>;
  deletePrescription(prescriptionId: string, doctorProfileId: string): Promise<DeletePrescriptionResult>;
  verifyByCode(verificationCode: string): Promise<VerifyPrescriptionResult>;
}
