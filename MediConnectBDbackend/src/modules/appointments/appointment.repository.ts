/**
 * Transaction-oriented contract for holds and appointments. Result unions distinguish missing,
 * expired, conflicting, forbidden, and retry outcomes so services can map them without depending
 * on MySQL errors.
 */

import type {
  AppointmentView,
  BookHoldResult,
  CancelAppointmentResult,
  CreateHoldResult,
  ReleaseHoldResult,
} from "./appointment.types";
import type { CancellationActor } from "./cancellation-policy";

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
  cancelAppointment(input: {
    appointmentId: string;
    actor: CancellationActor;
    actorId: string;
    reason: string;
    now: Date;
  }): Promise<CancelAppointmentResult>;
  listPatientAppointments(patientProfileId: string): Promise<AppointmentView[]>;
}
