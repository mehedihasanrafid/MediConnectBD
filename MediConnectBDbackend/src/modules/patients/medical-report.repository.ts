/**
 * Repository contract for patient medical reports.
 */

export interface MedicalReportSummary {
  id: string;
  patientProfileId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  notes: string | null;
  createdAt: Date;
}

export interface MedicalReportDetail extends MedicalReportSummary {
  contentBase64: string;
}

export interface CreateMedicalReportInput {
  patientProfileId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
  notes?: string | null | undefined;
}

export interface MedicalReportRepository {
  listByPatient(patientProfileId: string): Promise<MedicalReportSummary[]>;
  findById(reportId: string): Promise<MedicalReportDetail | null>;
  create(input: CreateMedicalReportInput): Promise<MedicalReportSummary>;
  deleteById(reportId: string, patientProfileId: string): Promise<boolean>;
  hasDoctorPatientRelationship(doctorProfileId: string, patientProfileId: string): Promise<boolean>;
}
