import { beforeEach, describe, expect, it } from "vitest";
import { PrescriptionService } from "../src/modules/prescriptions/prescription.service";
import type { PrescriptionRepository } from "../src/modules/prescriptions/prescription.repository";
import type {
  CreatePrescriptionResult,
  DeletePrescriptionResult,
  PrescriptionView,
  UpdatePrescriptionResult,
  VerifyPrescriptionResult,
} from "../src/modules/prescriptions/prescription.types";
import { randomUUID } from "crypto";

const doctorId = randomUUID();
const patientId = randomUUID();
const appointmentId = randomUUID();
const prescriptionId = randomUUID();

function makePrescription(id: string): PrescriptionView {
  return {
    id,
    appointmentId,
    patientProfileId: patientId,
    doctorProfileId: doctorId,
    diagnosis: "Common cold",
    medicines: [{ name: "Paracetamol", dosage: "500mg", frequency: "Every 6h", duration: "5 days" }],
    tests: [],
    advice: "Rest",
    verificationCode: "ABCDEF1234567890",
    isEditable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class FakePrescriptionRepository implements PrescriptionRepository {
  createResult: CreatePrescriptionResult = { kind: "CREATED", prescription: makePrescription(randomUUID()) };
  updateResult: UpdatePrescriptionResult = { kind: "UPDATED", prescription: makePrescription(prescriptionId) };
  deleteResult: DeletePrescriptionResult = { success: true };
  verifyResult: VerifyPrescriptionResult = {
    valid: true,
    prescription: {
      id: prescriptionId,
      verificationCode: "ABCDEF1234567890",
      doctorProfileId: doctorId,
      doctorName: "Demo Doctor",
      issuedAt: new Date(),
    },
  };
  patientPrescriptions: PrescriptionView[] = [makePrescription(randomUUID())];
  doctorPrescriptions: PrescriptionView[] = [makePrescription(randomUUID())];

  async createPrescription(_input: Parameters<PrescriptionRepository["createPrescription"]>[0], _doctorProfileId: string): Promise<CreatePrescriptionResult> {
    return this.createResult;
  }

  async getPatientPrescriptions(_patientProfileId: string): Promise<PrescriptionView[]> {
    return this.patientPrescriptions;
  }

  async getDoctorPrescriptions(_doctorProfileId: string): Promise<PrescriptionView[]> {
    return this.doctorPrescriptions;
  }

  async updatePrescription(_prescriptionId: string, _input: Parameters<PrescriptionRepository["updatePrescription"]>[1], _doctorProfileId: string): Promise<UpdatePrescriptionResult> {
    return this.updateResult;
  }

  async deletePrescription(_prescriptionId: string, _doctorProfileId: string): Promise<DeletePrescriptionResult> {
    return this.deleteResult;
  }

  async verifyByCode(_verificationCode: string): Promise<VerifyPrescriptionResult> {
    return this.verifyResult;
  }
}

describe("PrescriptionService", () => {
  let repo: FakePrescriptionRepository;
  let service: PrescriptionService;

  beforeEach(() => {
    repo = new FakePrescriptionRepository();
    service = new PrescriptionService(repo);
  });

  it("creates a prescription successfully", async () => {
    const result = await service.createPrescription(doctorId, {
      appointmentId,
      diagnosis: "Flu",
      medicines: [{ name: "Ibuprofen", dosage: "400mg", frequency: "Every 8h", duration: "5 days" }],
    });
    expect(result.kind).toBe("CREATED");
  });

  it("rejects empty medicines array", async () => {
    await expect(
      service.createPrescription(doctorId, {
        appointmentId,
        diagnosis: "Test",
        medicines: [],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_INPUT" });
  });

  it("returns APPOINTMENT_NOT_FOUND error", async () => {
    repo.createResult = { kind: "APPOINTMENT_NOT_FOUND" };
    await expect(
      service.createPrescription(doctorId, {
        appointmentId,
        diagnosis: "Test",
        medicines: [{ name: "Aspirin", dosage: "100mg", frequency: "Daily", duration: "3 days" }],
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: "APPOINTMENT_NOT_FOUND" });
  });

  it("returns ALREADY_HAS_PRESCRIPTION error", async () => {
    repo.createResult = { kind: "ALREADY_HAS_PRESCRIPTION" };
    await expect(
      service.createPrescription(doctorId, {
        appointmentId,
        diagnosis: "Test",
        medicines: [{ name: "Aspirin", dosage: "100mg", frequency: "Daily", duration: "3 days" }],
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: "ALREADY_HAS_PRESCRIPTION" });
  });

  it("returns DOCTOR_FORBIDDEN error", async () => {
    repo.createResult = { kind: "DOCTOR_FORBIDDEN" };
    await expect(
      service.createPrescription(doctorId, {
        appointmentId,
        diagnosis: "Test",
        medicines: [{ name: "Aspirin", dosage: "100mg", frequency: "Daily", duration: "3 days" }],
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: "DOCTOR_FORBIDDEN" });
  });

  it("updates a prescription successfully", async () => {
    const result = await service.updatePrescription(prescriptionId, doctorId, {
      diagnosis: "Updated diagnosis",
    });
    expect(result.kind).toBe("UPDATED");
  });

  it("returns PRESCRIPTION_NOT_FOUND on update", async () => {
    repo.updateResult = { kind: "PRESCRIPTION_NOT_FOUND" };
    await expect(
      service.updatePrescription(prescriptionId, doctorId, { diagnosis: "New" }),
    ).rejects.toMatchObject({ statusCode: 404, code: "PRESCRIPTION_NOT_FOUND" });
  });

  it("returns PRESCRIPTION_NOT_EDITABLE on update", async () => {
    repo.updateResult = { kind: "PRESCRIPTION_NOT_EDITABLE" };
    await expect(
      service.updatePrescription(prescriptionId, doctorId, { diagnosis: "New" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "PRESCRIPTION_NOT_EDITABLE" });
  });

  it("deletes a prescription successfully", async () => {
    const result = await service.deletePrescription(prescriptionId, doctorId);
    expect(result.success).toBe(true);
  });

  it("throws PRESCRIPTION_NOT_FOUND on failed delete", async () => {
    repo.deleteResult = { success: false, reason: "NOT_FOUND" };
    await expect(service.deletePrescription(prescriptionId, doctorId)).rejects.toMatchObject({
      statusCode: 404,
      code: "PRESCRIPTION_NOT_FOUND",
    });
  });

  it("throws PRESCRIPTION_NOT_EDITABLE on delete after 24h lock", async () => {
    repo.deleteResult = { success: false, reason: "NOT_EDITABLE" };
    await expect(service.deletePrescription(prescriptionId, doctorId)).rejects.toMatchObject({
      statusCode: 409,
      code: "PRESCRIPTION_NOT_EDITABLE",
    });
  });

  it("verifies a prescription by code", async () => {
    const result = await service.verifyByCode("ABCDEF1234567890");
    expect(result.valid).toBe(true);
    if (result.prescription) expect(result.prescription.verificationCode).toBe("ABCDEF1234567890");
  });

  it("lists patient prescriptions", async () => {
    const prescriptions = await service.getPatientPrescriptions(patientId);
    expect(prescriptions).toHaveLength(1);
  });

  it("lists doctor prescriptions", async () => {
    const prescriptions = await service.getDoctorPrescriptions(doctorId);
    expect(prescriptions).toHaveLength(1);
  });
});
