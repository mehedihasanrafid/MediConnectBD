import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_REPORT_MIME_TYPES,
  createMedicalReportSchema,
} from "../src/modules/patients/medical-report.schema";
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

    await expect(
      service.getForDownload(summary.id, {}),
    ).rejects.toMatchObject({ statusCode: 403, code: "MEDICAL_REPORT_FORBIDDEN" });

    await expect(
      service.getForDownload(randomUUID(), { patientProfileId: patientId }),
    ).rejects.toMatchObject({ statusCode: 404, code: "MEDICAL_REPORT_NOT_FOUND" });
  });

  it("validates report size boundaries on upload", async () => {
    const repo = new FakeMedicalReportRepository();
    const service = new MedicalReportService(repo);
    const patientId = randomUUID();

    // Empty content rejected
    await expect(
      service.create({
        patientProfileId: patientId,
        title: "Empty Report",
        fileName: "empty.pdf",
        mimeType: "application/pdf",
        contentBase64: "",
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_REPORT_CONTENT" });

    // Oversized content (> 2 MB) rejected
    const oversizedBase64 = Buffer.alloc(2.5 * 1024 * 1024).toString("base64");
    await expect(
      service.create({
        patientProfileId: patientId,
        title: "Large Report",
        fileName: "large.pdf",
        mimeType: "application/pdf",
        contentBase64: oversizedBase64,
      }),
    ).rejects.toMatchObject({ statusCode: 413, code: "REPORT_TOO_LARGE" });
  });

  it("enforces safe document MIME type allowlist on schema and service", async () => {
    const repo = new FakeMedicalReportRepository();
    const service = new MedicalReportService(repo);
    const patientId = randomUUID();

    // 1. Service-level rejection for unsupported MIME types
    const unsafeMimeTypes = [
      "application/x-msdownload",
      "application/javascript",
      "application/x-sh",
      "application/zip",
      "text/html",
    ];

    for (const unsafeMime of unsafeMimeTypes) {
      await expect(
        service.create({
          patientProfileId: patientId,
          title: "Unsafe File",
          fileName: "file.bin",
          mimeType: unsafeMime,
          contentBase64: Buffer.from("content").toString("base64"),
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "UNSUPPORTED_REPORT_MIME_TYPE",
      });
    }

    // 2. Schema-level rejection
    const schemaResult = createMedicalReportSchema.safeParse({
      title: "Malicious Script",
      fileName: "hack.sh",
      mimeType: "application/x-sh",
      contentBase64: Buffer.from("echo 1").toString("base64"),
    });
    expect(schemaResult.success).toBe(false);

    // 3. Allowed MIME types pass both schema and service
    for (const allowedMime of ALLOWED_REPORT_MIME_TYPES) {
      const validParse = createMedicalReportSchema.safeParse({
        title: "Valid Document",
        fileName: "document.pdf",
        mimeType: allowedMime,
        contentBase64: Buffer.from("sample content").toString("base64"),
      });
      expect(validParse.success).toBe(true);

      const created = await service.create({
        patientProfileId: patientId,
        title: `Valid ${allowedMime}`,
        fileName: "valid.doc",
        mimeType: allowedMime,
        contentBase64: Buffer.from("sample content").toString("base64"),
      });
      expect(created.mimeType).toBe(allowedMime);
    }
  });
});
