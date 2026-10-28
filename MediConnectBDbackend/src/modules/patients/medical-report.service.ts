/**
 * Service layer for patient medical reports. Enforces privacy boundaries: only the owning patient
 * or a doctor with an established appointment relationship may download a medical report.
 */

import { AppError } from "../../utils/app-error";
import { ALLOWED_REPORT_MIME_TYPES } from "./medical-report.schema";
import type {
  MedicalReportDetail,
  MedicalReportRepository,
  MedicalReportSummary,
} from "./medical-report.repository";

const MAX_REPORT_BYTES = 2 * 1024 * 1024; // 2 MB

export class MedicalReportService {
  constructor(private readonly repository: MedicalReportRepository) {}

  listByPatient(patientProfileId: string): Promise<MedicalReportSummary[]> {
    return this.repository.listByPatient(patientProfileId);
  }

  async create(input: {
    patientProfileId: string;
    title: string;
    fileName: string;
    mimeType: string;
    contentBase64: string;
    notes?: string | null | undefined;
  }): Promise<MedicalReportSummary> {
    if (!ALLOWED_REPORT_MIME_TYPES.includes(input.mimeType as any)) {
      throw new AppError(
        400,
        "UNSUPPORTED_REPORT_MIME_TYPE",
        `Unsupported document format "${input.mimeType}". Allowed formats: application/pdf, image/jpeg, image/png, image/webp, text/plain`,
      );
    }

    const cleanedBase64 = input.contentBase64.includes(",")
      ? input.contentBase64.slice(input.contentBase64.indexOf(",") + 1).trim()
      : input.contentBase64.trim();

    const buffer = Buffer.from(cleanedBase64, "base64");
    if (buffer.byteLength === 0) {
      throw new AppError(400, "INVALID_REPORT_CONTENT", "Medical report content cannot be empty");
    }
    if (buffer.byteLength > MAX_REPORT_BYTES) {
      throw new AppError(413, "REPORT_TOO_LARGE", "Medical report exceeds the 2 MB size limit");
    }

    return this.repository.create({
      patientProfileId: input.patientProfileId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: buffer.byteLength,
      contentBase64: cleanedBase64,
      notes: input.notes ?? null,
    });
  }

  async getForDownload(
    reportId: string,
    actor: { patientProfileId?: string | null; doctorProfileId?: string | null },
  ): Promise<MedicalReportDetail> {
    const report = await this.repository.findById(reportId);
    if (!report) {
      throw new AppError(404, "MEDICAL_REPORT_NOT_FOUND", "Medical report was not found");
    }

    if (actor.patientProfileId && actor.patientProfileId === report.patientProfileId) {
      return report;
    }

    if (actor.doctorProfileId) {
      const hasRelation = await this.repository.hasDoctorPatientRelationship(
        actor.doctorProfileId,
        report.patientProfileId,
      );
      if (hasRelation) {
        return report;
      }
    }

    throw new AppError(
      403,
      "MEDICAL_REPORT_FORBIDDEN",
      "Only the patient or their treating doctor can access this medical report",
    );
  }

  async delete(reportId: string, patientProfileId: string): Promise<void> {
    const deleted = await this.repository.deleteById(reportId, patientProfileId);
    if (!deleted) {
      throw new AppError(404, "MEDICAL_REPORT_NOT_FOUND", "Medical report was not found");
    }
  }
}
