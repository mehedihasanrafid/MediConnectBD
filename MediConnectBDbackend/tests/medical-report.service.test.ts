import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type {
  CreateMedicalReportInput,
  MedicalReportDetail,
  MedicalReportRepository,
  MedicalReportSummary,
} from "../src/modules/patients/medical-report.repository";
import { MedicalReportService } from "../src/modules/patients/medical-report.service";

class FakeMedicalReportRepository implements MedicalReportRepository {
  reports = new Map<string, MedicalReportDetail>();
  doctorRelations = new Set<string>();

  async listByPatient(patientProfileId: string): Promise<MedicalReportSummary[]> {
    return [...this.reports.values()]
      .filter((r) => r.patientProfileId === patientProfileId)
      .map(({ contentBase64: _content, ...summary }) => summary);
  }

  async findById(reportId: string): Promise<MedicalReportDetail | null> {
    return this.reports.get(reportId) ?? null;
  }

  async create(input: CreateMedicalReportInput): Promise<MedicalReportSummary> {
    const id = randomUUID();
    const detail: MedicalReportDetail = {
      id,
      patientProfileId: input.patientProfileId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      contentBase64: input.contentBase64,
      notes: input.notes ?? null,
      createdAt: new Date(),
    };
    this.reports.set(id, detail);
    const { contentBase64: _content, ...summary } = detail;
    return summary;
  }

  async deleteById(reportId: string, patientProfileId: string): Promise<boolean> {
    const existing = this.reports.get(reportId);
    if (!existing || existing.patientProfileId !== patientProfileId) return false;
    this.reports.delete(reportId);
    return true;
  }

  async hasDoctorPatientRelationship(
    doctorProfileId: string,
    patientProfileId: string,
  ): Promise<boolean> {
    return this.doctorRelations.has(`${doctorProfileId}:${patientProfileId}`);
  }
}

describe("MedicalReportService", () => {
  it("uploads, lists, and enforces patient/treating-doctor privacy on downloads", async () => {
    const repo = new FakeMedicalReportRepository();
    const service = new MedicalReportService(repo);
    const patientId = randomUUID();
    const treatingDoctorId = randomUUID();
    const unrelatedDoctorId = randomUUID();

    repo.doctorRelations.add(`${treatingDoctorId}:${patientId}`);

    const summary = await service.create({
      patientProfileId: patientId,
      title: "Lipid Profile",
      fileName: "lipid.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from("%PDF-1.4 sample report").toString("base64"),
      notes: "Fasting",
    });

    expect(summary.title).toBe("Lipid Profile");
    expect(summary.sizeBytes).toBeGreaterThan(0);

    const byPatient = await service.getForDownload(summary.id, { patientProfileId: patientId });
    expect(byPatient.contentBase64).toBeTruthy();

    const byTreatingDoctor = await service.getForDownload(summary.id, {
      doctorProfileId: treatingDoctorId,
    });
    expect(byTreatingDoctor.id).toBe(summary.id);

    await expect(
      service.getForDownload(summary.id, { doctorProfileId: unrelatedDoctorId }),
    ).rejects.toMatchObject({ statusCode: 403, code: "MEDICAL_REPORT_FORBIDDEN" });
  });
});
