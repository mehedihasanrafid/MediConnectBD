import type { AppointmentStatus } from "../../database/entities/appointment.entity";
import type { ConsultationMode } from "../../database/entities/consultation-mode";
import type { SlotHoldStatus } from "../../database/entities/slot-hold.entity";

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

export interface AppointmentView {
  id: string;
  patientProfileId: string;
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
  | { kind: "BOOKING_TOO_LATE" };

export type BookHoldResult =
  | { kind: "BOOKED" | "EXISTING"; appointment: AppointmentView }
  | { kind: "HOLD_NOT_FOUND" }
  | { kind: "HOLD_FORBIDDEN" }
  | { kind: "HOLD_EXPIRED" }
  | { kind: "HOLD_NOT_ACTIVE" };

export type ReleaseHoldResult =
  | { kind: "RELEASED" | "ALREADY_CLOSED" }
  | { kind: "HOLD_NOT_FOUND" }
  | { kind: "HOLD_FORBIDDEN" };
