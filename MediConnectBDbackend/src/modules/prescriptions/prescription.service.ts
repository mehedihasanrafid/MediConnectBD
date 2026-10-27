/**
 * Prescription service — validates input, enforces business rules (24h edit window),
 * and delegates to repository.
 */

import { AppError } from "../../utils/app-error";
import { suggestMedicines, type MedicineSuggestion } from "./medicine-catalog";
import { buildPrescriptionPdfBuffer } from "./prescription-pdf";
import type { PrescriptionRepository } from "./prescription.repository";
import type {
  CreatePrescriptionInput,
  CreatePrescriptionResult,
  DeletePrescriptionResult,
  UpdatePrescriptionInput,
  UpdatePrescriptionResult,
  VerifyPrescriptionResult,
} from "./prescription.types";

export class PrescriptionService {
  constructor(private readonly repository: PrescriptionRepository) {}

  suggestMedicines(query: string): MedicineSuggestion[] {
    return suggestMedicines(query);
  }

  async getPrescriptionPdf(
    prescriptionId: string,
    actor: { patientProfileId?: string | null; doctorProfileId?: string | null },
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const data = await this.repository.getPrescriptionForPdf(prescriptionId);
    if (!data) {
      throw new AppError(404, "PRESCRIPTION_NOT_FOUND", "Prescription was not found");
    }

    const isOwningPatient =
      Boolean(actor.patientProfileId) && actor.patientProfileId === data.prescription.patientProfileId;
    const isPrescribingDoctor =
      Boolean(actor.doctorProfileId) && actor.doctorProfileId === data.prescription.doctorProfileId;

    if (!isOwningPatient && !isPrescribingDoctor) {
      throw new AppError(
        403,
        "PRESCRIPTION_FORBIDDEN",
        "Only the patient or prescribing doctor can download this prescription",
      );
    }

    const buffer = buildPrescriptionPdfBuffer(data);
    return {
      buffer,
      fileName: `prescription-${data.prescription.verificationCode}.pdf`,
    };
  }

  async createPrescription(
    doctorProfileId: string,
    input: CreatePrescriptionInput,
  ): Promise<CreatePrescriptionResult> {
    // Validate medicines array is not empty
    if (!input.medicines || input.medicines.length === 0) {
      throw new AppError(400, "INVALID_INPUT", "At least one medicine is required");
    }

    const result = await this.repository.createPrescription(input, doctorProfileId);

    if (result.kind === "APPOINTMENT_NOT_FOUND") {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
    }
    if (result.kind === "APPOINTMENT_NOT_COMPLETED") {
      throw new AppError(409, "APPOINTMENT_NOT_COMPLETED", "Only completed appointments can have prescriptions");
    }
    if (result.kind === "ALREADY_HAS_PRESCRIPTION") {
      throw new AppError(409, "ALREADY_HAS_PRESCRIPTION", "A prescription already exists for this appointment");
    }
    if (result.kind === "DOCTOR_FORBIDDEN") {
      throw new AppError(403, "DOCTOR_FORBIDDEN", "Only the treating doctor can prescribe");
    }

    return result;
  }

  getPatientPrescriptions(patientProfileId: string) {
    return this.repository.getPatientPrescriptions(patientProfileId);
  }

  getDoctorPrescriptions(doctorProfileId: string) {
    return this.repository.getDoctorPrescriptions(doctorProfileId);
  }

  async updatePrescription(
    prescriptionId: string,
    doctorProfileId: string,
    input: UpdatePrescriptionInput,
  ): Promise<UpdatePrescriptionResult> {
    const result = await this.repository.updatePrescription(prescriptionId, input, doctorProfileId);

    if (result.kind === "PRESCRIPTION_NOT_FOUND") {
      throw new AppError(404, "PRESCRIPTION_NOT_FOUND", "Prescription was not found");
    }
    if (result.kind === "PRESCRIPTION_NOT_EDITABLE") {
      throw new AppError(409, "PRESCRIPTION_NOT_EDITABLE", "Prescription edit window has expired (24h)");
    }
    if (result.kind === "DOCTOR_FORBIDDEN") {
      throw new AppError(403, "DOCTOR_FORBIDDEN", "Only the prescribing doctor can edit");
    }

    return result;
  }

  async deletePrescription(
    prescriptionId: string,
    doctorProfileId: string,
  ): Promise<DeletePrescriptionResult> {
    const result = await this.repository.deletePrescription(prescriptionId, doctorProfileId);
    if (!result.success) {
      if (result.reason === "NOT_EDITABLE") {
        throw new AppError(409, "PRESCRIPTION_NOT_EDITABLE", "Prescription cannot be deleted after the 24h edit window");
      }
      throw new AppError(404, "PRESCRIPTION_NOT_FOUND", "Prescription was not found");
    }
    return result;
  }

  async verifyByCode(verificationCode: string): Promise<VerifyPrescriptionResult> {
    const result = await this.repository.verifyByCode(verificationCode);
    if (!result.valid) {
      throw new AppError(404, "VERIFICATION_FAILED", "Invalid verification code");
    }
    return result;
  }
}
