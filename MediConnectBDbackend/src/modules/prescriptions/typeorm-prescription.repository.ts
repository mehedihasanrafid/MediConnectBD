/**
 * TypeORM implementation of the prescription repository. Handles persistence, validation,
 * 24h edit window enforcement, and verification code management.
 */

import type { DataSource } from "typeorm";
import { Prescription, PrescriptionVersion } from "./prescription.entity";
import type { PrescriptionRepository } from "./prescription.repository";
import type {
  CreatePrescriptionInput,
  CreatePrescriptionResult,
  DeletePrescriptionResult,
  PrescriptionView,
  UpdatePrescriptionInput,
  UpdatePrescriptionResult,
  VerifyPrescriptionResult,
} from "./prescription.types";
import { Appointment, AppointmentStatus } from "../appointments/appointment.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";

export class TypeOrmPrescriptionRepository implements PrescriptionRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createPrescription(
    input: CreatePrescriptionInput,
    doctorProfileId: string,
  ): Promise<CreatePrescriptionResult> {
    return this.dataSource.transaction(async (manager) => {
      const appointments = manager.getRepository(Appointment);
      const prescriptionRepo = manager.getRepository(Prescription);

      // Check if appointment exists and is completed
      const appointment = await appointments.findOne({
        where: { id: input.appointmentId },
        relations: { patientProfile: true, doctor: true },
      });

      if (!appointment) {
        return { kind: "APPOINTMENT_NOT_FOUND" };
      }

      if (appointment.status !== AppointmentStatus.COMPLETED) {
        return { kind: "APPOINTMENT_NOT_COMPLETED" };
      }

      // Only the doctor who treated the patient can prescribe
      if (appointment.doctor.id !== doctorProfileId) {
        return { kind: "DOCTOR_FORBIDDEN" };
      }

      // Check if already has a prescription for this appointment
      const existing = await prescriptionRepo.findOne({
        where: { appointmentId: input.appointmentId },
      });

      if (existing) {
        return { kind: "ALREADY_HAS_PRESCRIPTION" };
      }

      // Generate unique verification code
      const verificationCode = this.generateVerificationCode();

      // Create the prescription
      const prescription = prescriptionRepo.create({
        appointmentId: input.appointmentId,
        patientProfileId: appointment.patientProfileId,
        doctorProfileId,
        diagnosis: input.diagnosis,
        medicines: input.medicines,
        tests: input.tests ?? [],
        advice: input.advice ?? null,
        verificationCode,
        isEditable: true,
      });

      const saved = await prescriptionRepo.save(prescription);
      return { kind: "CREATED", prescription: this.toView(saved) };
    });
  }

  async getPatientPrescriptions(patientProfileId: string): Promise<PrescriptionView[]> {
    const prescriptions = await this.dataSource
      .getRepository(Prescription)
      .find({
        where: { patientProfileId },
        order: { createdAt: "DESC" },
      });
    return prescriptions.map((p) => this.toView(p));
  }

  async getDoctorPrescriptions(doctorProfileId: string): Promise<PrescriptionView[]> {
    const prescriptions = await this.dataSource
      .getRepository(Prescription)
      .find({
        where: { doctorProfileId },
        order: { createdAt: "DESC" },
      });
    return prescriptions.map((p) => this.toView(p));
  }

  async updatePrescription(
    prescriptionId: string,
    input: UpdatePrescriptionInput,
    doctorProfileId: string,
  ): Promise<UpdatePrescriptionResult> {
    return this.dataSource.transaction(async (manager) => {
      const prescriptionRepo = manager.getRepository(Prescription);

      const prescription = await prescriptionRepo.findOne({
        where: { id: prescriptionId, doctorProfileId },
      });

      if (!prescription) {
        return { kind: "PRESCRIPTION_NOT_FOUND" };
      }

      // Check 24h edit window
      const now = new Date();
      const createdAt = new Date(prescription.createdAt);
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 24 || !prescription.isEditable) {
        return { kind: "PRESCRIPTION_NOT_EDITABLE" };
      }

      // Save version before updating
      const versionRepo = manager.getRepository(PrescriptionVersion);
      await versionRepo.save(
        versionRepo.create({
          prescriptionId,
          diagnosis: prescription.diagnosis,
          medicines: prescription.medicines,
          tests: prescription.tests,
          advice: prescription.advice,
          editedBy: doctorProfileId,
        }),
      );

      // Update prescription (remains editable within the 24-hour window)
      Object.assign(prescription, {
        diagnosis: input.diagnosis ?? prescription.diagnosis,
        medicines: input.medicines ?? prescription.medicines,
        tests: input.tests ?? prescription.tests,
        advice: input.advice !== undefined ? input.advice : prescription.advice,
      });

      const updated = await prescriptionRepo.save(prescription);
      return { kind: "UPDATED", prescription: this.toView(updated) };
    });
  }

  async deletePrescription(
    prescriptionId: string,
    doctorProfileId: string,
  ): Promise<DeletePrescriptionResult> {
    return this.dataSource.transaction(async (manager) => {
      const prescriptionRepo = manager.getRepository(Prescription);
      const prescription = await prescriptionRepo.findOne({
        where: { id: prescriptionId, doctorProfileId },
      });

      if (!prescription) {
        return { success: false, reason: "NOT_FOUND" };
      }

      const hoursSinceCreation =
        (Date.now() - new Date(prescription.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24 || !prescription.isEditable) {
        return { success: false, reason: "NOT_EDITABLE" };
      }

      await prescriptionRepo.delete({ id: prescriptionId, doctorProfileId });
      return { success: true };
    });
  }

  async verifyByCode(verificationCode: string): Promise<VerifyPrescriptionResult> {
    const prescription = await this.dataSource
      .getRepository(Prescription)
      .findOne({
        where: { verificationCode },
        relations: { doctorProfile: { user: true } },
      });

    if (!prescription) {
      return { valid: false, prescription: null };
    }

    const doctorUser = prescription.doctorProfile?.user;
    const doctorName = doctorUser
      ? `${doctorUser.firstName} ${doctorUser.lastName}`.trim()
      : null;

    return {
      valid: true,
      prescription: {
        id: prescription.id,
        verificationCode: prescription.verificationCode,
        doctorProfileId: prescription.doctorProfileId,
        doctorName,
        issuedAt: prescription.createdAt,
      },
    };
  }

  private generateVerificationCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 16; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private toView(prescription: Prescription): PrescriptionView {
    const withinWindow =
      (Date.now() - new Date(prescription.createdAt).getTime()) / (1000 * 60 * 60) <= 24;
    return {
      id: prescription.id,
      appointmentId: prescription.appointmentId,
      patientProfileId: prescription.patientProfileId,
      doctorProfileId: prescription.doctorProfileId,
      diagnosis: prescription.diagnosis,
      medicines: prescription.medicines,
      tests: prescription.tests,
      advice: prescription.advice,
      verificationCode: prescription.verificationCode,
      isEditable: prescription.isEditable && withinWindow,
      createdAt: prescription.createdAt,
      updatedAt: prescription.updatedAt,
    };
  }
}
