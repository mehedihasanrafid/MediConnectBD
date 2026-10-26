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

export interface CancellationOutcome {
  appointment: Appointment;
  refundPercent: number;
  refundAmount: string;
  refundId: string | null;
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

export interface DoctorAppointmentPatient {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
}

export interface DoctorAppointment extends Appointment {
  patient: DoctorAppointmentPatient | null;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  doctorProfileId: string;
  diagnosis: string;
  medicines: Medicine[];
  tests: string[];
  advice: string | null;
  verificationCode: string;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedPrescriptionSummary {
  id: string;
  verificationCode: string;
  doctorProfileId: string;
  doctorName: string | null;
  issuedAt: string;
}

export interface VerifyPrescriptionResponse {
  valid: boolean;
  prescription: VerifiedPrescriptionSummary | null;
}

export interface Review {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  doctorProfileId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  transactionId: string;
  amount: string;
  currency: "BDT";
  status: string;
  gatewayUrl: string | null;
  expiresAt: string;
}

export interface AdminOverview {
  users: { total: number; active: number; suspended: number; pending: number };
  doctors: { total: number; approved: number; pendingReview: number };
  appointments: { total: number; confirmed: number; cancelled: number; completed: number };
  payments: { succeeded: number; grossAmount: number; commissionAmount: number; netAmount: number };
  refunds: { requested: number; totalAmount: number };
}

