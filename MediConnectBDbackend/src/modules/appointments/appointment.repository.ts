/**
 * Transaction-oriented contract for holds and appointments. Result unions distinguish missing,
 * expired, conflicting, forbidden, and retry outcomes so services can map them without depending
 * on MySQL errors.
 */

import type {
  AppointmentView,
  BookHoldResult,
  CreateHoldResult,
  ReleaseHoldResult,
} from "./appointment.types";

export interface AppointmentRepository {
  createHold(input: {
    slotId: string;
    patientProfileId: string;
    now: Date;
    expiresAt: Date;
    minimumStartAt: Date;
  }): Promise<CreateHoldResult>;
  bookHold(input: {
    holdId: string;
    patientProfileId: string;
    now: Date;
  }): Promise<BookHoldResult>;
  releaseHold(input: {
    holdId: string;
    patientProfileId: string;
    now: Date;
  }): Promise<ReleaseHoldResult>;
  listPatientAppointments(patientProfileId: string): Promise<AppointmentView[]>;
}
