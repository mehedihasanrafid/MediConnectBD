/**
 * Defines private onboarding details, intentionally smaller public doctor views, catalog entries,
 * and paginated queries. Fees in these views are presentation numbers; persistence snapshots use
 * decimal strings.
 */

import type { DoctorApplicationStatus } from "./doctor-profile.entity";

export interface DoctorSpecialtyView {
  id: string;
  name: string;
  slug: string;
}

export interface DoctorHospitalView {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string;
}

export interface DoctorChamberView {
  id: string;
  roomOrUnit: string | null;
  consultationFee: number;
  isActive: boolean;
  hospital: DoctorHospitalView;
}

export interface DoctorProfileDetails {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  bmdcNumber: string;
  degrees: string | null;
  experienceYears: number;
  bio: string | null;
  photoUrl: string | null;
  languages: string[];
  videoConsultationFee: number | null;
  applicationStatus: DoctorApplicationStatus;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  specialties: DoctorSpecialtyView[];
  chambers: DoctorChamberView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicDoctorProfile {
  id: string;
  firstName: string;
  lastName: string;
  degrees: string | null;
  experienceYears: number;
  bio: string | null;
  photoUrl: string | null;
  languages: string[];
  videoConsultationFee: number | null;
  minimumFee: number | null;
  averageRating: number | null;
  reviewCount: number;
  specialties: DoctorSpecialtyView[];
  chambers: DoctorChamberView[];
}

export interface DoctorEarningsPeriodRow {
  period: string;
  appointmentsCount: number;
  grossAmount: string;
  commissionAmount: string;
  netAmount: string;
}

export interface DoctorEarningsSummary {
  totals: {
    succeededPayments: number;
    completedConsultations: number;
    grossAmount: string;
    commissionAmount: string;
    netAmount: string;
  };
  byDay: DoctorEarningsPeriodRow[];
  byMonth: DoctorEarningsPeriodRow[];
}

export interface ChamberInput {
  hospitalId: string;
  roomOrUnit?: string | null | undefined;
  consultationFee: number;
}

export interface UpdateDoctorProfileInput {
  degrees?: string | null | undefined;
  experienceYears?: number | undefined;
  bio?: string | null | undefined;
  photoUrl?: string | null | undefined;
  languages?: string[] | undefined;
  videoConsultationFee?: number | null | undefined;
  specialtyIds?: string[] | undefined;
  chambers?: ChamberInput[] | undefined;
}

export interface PublicDoctorQuery {
  search?: string | undefined;
  specialty?: string | undefined;
  hospital?: string | undefined;
  area?: string | undefined;
  minFee?: number | undefined;
  maxFee?: number | undefined;
  page: number;
  limit: number;
}

export interface DoctorApplicationQuery {
  status: DoctorApplicationStatus;
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type DoctorReviewInput =
  | { decision: DoctorApplicationStatus.APPROVED; reason?: undefined }
  | { decision: DoctorApplicationStatus.REJECTED; reason: string };

export interface CatalogSpecialty {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogHospital extends DoctorHospitalView {}

export interface DoctorPatientVisitView {
  id: string;
  doctorId: string;
  doctorName: string | null;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  mode: string;
  status: string;
  familyMember: {
    id: string;
    name: string;
    relationship: string;
  } | null;
}

export interface DoctorPatientPrescriptionView {
  id: string;
  appointmentId: string;
  doctorProfileId: string;
  diagnosis: string;
  medicines: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  tests: string[];
  advice: string | null;
  verificationCode: string;
  createdAt: Date;
}

export interface DoctorPatientReportView {
  id: string;
  patientProfileId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  notes: string | null;
  createdAt: Date;
}

export interface DoctorPatientHistory {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
    sex: string;
  };
  visits: DoctorPatientVisitView[];
  prescriptions: DoctorPatientPrescriptionView[];
  reports: DoctorPatientReportView[];
}

export type DoctorPatientHistoryResult =
  | { kind: "OK"; history: DoctorPatientHistory }
  | { kind: "PATIENT_NOT_FOUND" }
  | { kind: "DOCTOR_FORBIDDEN" };

