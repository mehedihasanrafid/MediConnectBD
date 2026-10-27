/**
 * TypeORM implementation of the medical report repository.
 */

import type { DataSource } from "typeorm";
import { Appointment } from "../appointments/appointment.entity";
import { MedicalReport } from "./medical-report.entity";
import type {
  CreateMedicalReportInput,
  MedicalReportDetail,
  MedicalReportRepository,
  MedicalReportSummary,
} from "./medical-report.repository";

export class TypeOrmMedicalReportRepository implements MedicalReportRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listByPatient(patientProfileId: string): Promise<MedicalReportSummary[]> {
    const reports = await this.dataSource
      .getRepository(MedicalReport)
      .createQueryBuilder("report")
      .select([
        "report.id",
        "report.patientProfileId",
        "report.title",
        "report.fileName",
        "report.mimeType",
        "report.sizeBytes",
        "report.notes",
        "report.createdAt",
      ])
      .where("report.patient_profile_id = :patientProfileId", { patientProfileId })
      .orderBy("report.created_at", "DESC")
      .getMany();

    return reports.map((r) => this.toSummary(r));
  }

  async findById(reportId: string): Promise<MedicalReportDetail | null> {
    const report = await this.dataSource.getRepository(MedicalReport).findOne({
      where: { id: reportId },
    });
    if (!report) return null;
    return {
      ...this.toSummary(report),
      contentBase64: report.contentBase64,
    };
  }

  async create(input: CreateMedicalReportInput): Promise<MedicalReportSummary> {
    const repo = this.dataSource.getRepository(MedicalReport);
    const saved = await repo.save(
      repo.create({
        patientProfileId: input.patientProfileId,
        title: input.title,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        contentBase64: input.contentBase64,
        notes: input.notes ?? null,
      }),
    );
    return this.toSummary(saved);
  }

  async deleteById(reportId: string, patientProfileId: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(MedicalReport).delete({
      id: reportId,
      patientProfileId,
    });
    return result.affected === 1;
  }

  async hasDoctorPatientRelationship(
    doctorProfileId: string,
    patientProfileId: string,
  ): Promise<boolean> {
    const count = await this.dataSource.getRepository(Appointment).count({
      where: {
        doctorProfileId,
        patientProfileId,
      },
    });
    return count > 0;
  }

  private toSummary(report: MedicalReport): MedicalReportSummary {
    return {
      id: report.id,
      patientProfileId: report.patientProfileId,
      title: report.title,
      fileName: report.fileName,
      mimeType: report.mimeType,
      sizeBytes: Number(report.sizeBytes),
      notes: report.notes,
      createdAt: report.createdAt,
    };
  }
}
