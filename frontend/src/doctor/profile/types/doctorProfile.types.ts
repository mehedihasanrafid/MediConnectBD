import type { Hospital, Specialty } from "../../../shared/types";
import type { DoctorApplicationStatus } from "../../dashboard/types/doctorDashboard.types";

export interface DoctorChamberDetail {
  id?: string;
  hospitalId: string;
  roomOrUnit?: string | null;
  consultationFee: number;
  isActive?: boolean;
  hospital?: Hospital;
}

export interface DoctorProfileData {
  id: string;
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bmdcNumber: string;
  degrees: string | null;
  experienceYears: number;
  bio: string | null;
  photoUrl?: string | null;
  languages: string[];
  applicationStatus: DoctorApplicationStatus;
  rejectionReason: string | null;
  videoConsultationFee: number | null;
  specialties: Specialty[];
  chambers: DoctorChamberDetail[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorProfilePatchPayload {
  degrees?: string | null;
  experienceYears?: number;
  bio?: string | null;
  languages?: string[];
  videoConsultationFee?: number | null;
  specialtyIds?: string[];
  chambers?: Array<{
    hospitalId: string;
    roomOrUnit?: string | null;
    consultationFee: number;
  }>;
}

export interface ChamberFormValues {
  hospitalId: string;
  roomOrUnit: string;
  consultationFee: string;
}
