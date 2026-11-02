export type DoctorApplicationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | (string & {});

export interface DoctorProfileDetails {
  id: string;
  bmdcNumber: string;
  degrees: string | null;
  experienceYears: number;
  bio: string | null;
  languages: string[];
  applicationStatus: DoctorApplicationStatus;
  rejectionReason: string | null;
  videoConsultationFee: number | null;
  specialties: Array<{ id: string; name: string }>;
  chambers: Array<{ id: string; consultationFee: number; isActive: boolean }>;
}

export interface ScheduleRule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  mode: "VIDEO" | "CHAMBER";
  chamberId?: string | null;
  isActive: boolean;
}

export interface ScheduleOverview {
  timezone: string;
  rules: ScheduleRule[];
  timeOff: Array<{
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    reason?: string | null;
  }>;
}
