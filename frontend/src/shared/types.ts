/**
 * Shared API response types mirroring the backend contracts. Keep these aligned with the
 * backend schemas; do not invent fields the API does not return.
 */

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  roles: string[];
  patientProfileId: string | null;
  doctorProfile: {
    id: string;
    applicationStatus: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  } | null;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  tokenType: string;
  user: PublicUser;
}

export interface Specialty {
  id: string;
  name: string;
  slug: string;
}

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string;
}

export interface DoctorChamber {
  id: string;
  roomOrUnit: string | null;
  consultationFee: number;
  isActive: boolean;
  hospital: Hospital;
}

export interface PublicDoctor {
  id: string;
  firstName: string;
  lastName: string;
  degrees: string | null;
  experienceYears: number;
  bio: string | null;
  photoUrl: string | null;
  languages: string[] | null;
  videoConsultationFee: number | null;
  minimumFee: number | null;
  specialties: Specialty[];
  chambers: DoctorChamber[];
}

export interface DoctorListResponse {
  items: PublicDoctor[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  startAt: string;
  endAt: string;
  mode: "VIDEO" | "CHAMBER";
  feeAmount: number;
  chamber: { id: string; roomOrUnit: string | null } | null;
}

export interface AvailabilityResponse {
  doctorId: string;
  timezone: string;
  from: string;
  through: string;
  items: AvailabilitySlot[];
}

export interface SlotHold {
  id: string;
  patientProfileId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  slot: AvailabilitySlot;
}

export interface Appointment {
  id: string;
  patientProfileId: string;
  doctorId: string;
  holdId: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  mode: "VIDEO" | "CHAMBER";
  feeAmount: number;
  paymentRequired: boolean;
  paymentReference: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  slot: AvailabilitySlot;
}

export interface FamilyMember {
  id: string;
  patientProfileId: string;
  name: string;
  relationship: string;
  dateOfBirth: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}
