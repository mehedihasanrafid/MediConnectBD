/**
 * Booking projections and explicit transactional outcomes. View fees are presentation numbers;
 * appointment/slot entities retain historical decimal amounts. Existing-result outcomes make
 * eligible command retries safe.
 */

import type { AppointmentStatus } from "./appointment.entity";
import type { ConsultationMode } from "./consultation-mode";
import type { SlotHoldStatus } from "./slot-hold.entity";

export interface BookingSlotView {
  id: string;
  doctorId: string;
  startAt: Date;
  endAt: Date;
  mode: ConsultationMode;
  feeAmount: number;
  chamber: {
    id: string;
    roomOrUnit: string | null;
    hospital: {
      id: string;
      name: string;
      area: string;
      address: string;
    };
  } | null;
}

export interface SlotHoldView {
  id: string;
  patientProfileId: string;
  status: SlotHoldStatus;
  expiresAt: Date;
  createdAt: Date;
  slot: BookingSlotView;
}

export interface AppointmentFamilyMemberView {
  id: string;
  name: string;
  relationship: string;
}

export interface AppointmentView {
  id: string;
  patientProfileId: string;
  familyMemberId?: string | null;
  familyMember?: AppointmentFamilyMemberView | null;
  doctorId: string;
  holdId: string;
  status: AppointmentStatus;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  mode: ConsultationMode;
  feeAmount: number;
  paymentRequired: boolean;
  paymentReference: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  slot: BookingSlotView;
}

export type CreateHoldResult =
  | { kind: "CREATED" | "EXISTING"; hold: SlotHoldView }
  | { kind: "SLOT_NOT_FOUND" }
  | { kind: "SLOT_UNAVAILABLE" }
  | { kind: "BOOKING_TOO_LATE" }
  | { kind: "PATIENT_OVERLAP" };

export type BookHoldResult =
  | { kind: "BOOKED" | "EXISTING"; appointment: AppointmentView }
  | { kind: "HOLD_NOT_FOUND" }
  | { kind: "HOLD_FORBIDDEN" }
  | { kind: "HOLD_EXPIRED" }
  | { kind: "HOLD_NOT_ACTIVE" }
  | { kind: "FAMILY_MEMBER_NOT_FOUND" }
  | { kind: "PATIENT_OVERLAP" };

export type RescheduleAppointmentResult =
  | { kind: "RESCHEDULED"; appointment: AppointmentView }
  | { kind: "APPOINTMENT_NOT_FOUND" }
  | { kind: "APPOINTMENT_FORBIDDEN" }
  | { kind: "APPOINTMENT_NOT_RESCHEDULABLE" }
  | { kind: "SLOT_NOT_FOUND" }
  | { kind: "SLOT_UNAVAILABLE" }
  | { kind: "SLOT_MISMATCH" }
  | { kind: "BOOKING_TOO_LATE" }
  | { kind: "PATIENT_OVERLAP" };

export type ReleaseHoldResult =
  | { kind: "RELEASED" | "ALREADY_CLOSED" }
  | { kind: "HOLD_NOT_FOUND" }
  | { kind: "HOLD_FORBIDDEN" };

export interface CancellationOutcome {
  appointment: AppointmentView;
  refundPercent: number;
  refundAmount: string;
  refundId: string | null;
}

export type CancelAppointmentResult =
  | { kind: "CANCELLED" | "ALREADY_CANCELLED"; outcome: CancellationOutcome }
  | { kind: "APPOINTMENT_NOT_FOUND" }
  | { kind: "APPOINTMENT_FORBIDDEN" }
  | { kind: "APPOINTMENT_NOT_CANCELLABLE" };

export interface DoctorAppointmentPatientView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface DoctorAppointmentView extends AppointmentView {
  patient: DoctorAppointmentPatientView | null;
}

export type TransitionAppointmentStatusResult =
  | { kind: "UPDATED" | "ALREADY_IN_STATUS"; appointment: AppointmentView }
  | { kind: "APPOINTMENT_NOT_FOUND" }
  | { kind: "APPOINTMENT_FORBIDDEN" }
  | { kind: "APPOINTMENT_INVALID_STATE" };

export interface AppointmentVideoEligibilityDetails {
  appointmentId: string;
  doctorProfileId: string;
  patientProfileId: string;
  doctorName: string;
  patientName: string;
  participantRole: "PATIENT" | "DOCTOR";
  participantName: string;
  participantIdentity: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  opensAt: Date;
  closesAt: Date;
}

export type AppointmentVideoEligibilityResult =
  | { kind: "OK"; details: AppointmentVideoEligibilityDetails }
  | { kind: "APPOINTMENT_NOT_FOUND" }
  | { kind: "APPOINTMENT_FORBIDDEN" }
  | { kind: "VIDEO_NOT_APPLICABLE" }
  | { kind: "VIDEO_NOT_CONFIRMED" }
  | {
      kind: "VIDEO_WINDOW_CLOSED";
      opensAt: Date;
      closesAt: Date;
      scheduledStartAt: Date;
      scheduledEndAt: Date;
    };

export interface VideoSessionView {
  appointmentId: string;
  roomName: string;
  roomUrl: string;
  accessToken: string;
  participantRole: "PATIENT" | "DOCTOR";
  participantName: string;
  doctorName: string;
  patientName: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  opensAt: Date;
  closesAt: Date;
}

export type GetVideoSessionResult =
  | { kind: "OK"; session: VideoSessionView }
  | { kind: "APPOINTMENT_NOT_FOUND" }
  | { kind: "APPOINTMENT_FORBIDDEN" }
  | { kind: "VIDEO_NOT_APPLICABLE" }
  | { kind: "VIDEO_NOT_CONFIRMED" }
  | {
      kind: "VIDEO_WINDOW_CLOSED";
      opensAt: Date;
      closesAt: Date;
      scheduledStartAt: Date;
      scheduledEndAt: Date;
    };

