/**
 * Transaction-oriented contract for holds and appointments. Result unions distinguish missing,
 * expired, conflicting, forbidden, and retry outcomes so services can map them without depending
 * on MySQL errors.
 */

import type { AppointmentStatus } from "./appointment.entity";
import type {
  AppointmentView,
  BookHoldResult,
  CancelAppointmentResult,
  CreateHoldResult,
  DoctorAppointmentView,
  GetVideoSessionResult,
  ReleaseHoldResult,
  RescheduleAppointmentResult,
  TransitionAppointmentStatusResult,
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
    familyMemberId?: string | null | undefined;
    now: Date;
  }): Promise<BookHoldResult>;
  rescheduleAppointment(input: {
    appointmentId: string;
    patientProfileId: string;
    newSlotId: string;
    now: Date;
    minimumStartAt: Date;
  }): Promise<RescheduleAppointmentResult>;
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
  transitionAppointmentStatus(input: {
    appointmentId: string;
    doctorProfileId: string;
    targetStatus: AppointmentStatus.COMPLETED | AppointmentStatus.NO_SHOW;
    now: Date;
  }): Promise<TransitionAppointmentStatusResult>;
  listPatientAppointments(patientProfileId: string): Promise<AppointmentView[]>;
  listDoctorAppointments(doctorProfileId: string): Promise<DoctorAppointmentView[]>;
  getVideoSession?(input: {
    appointmentId: string;
    actor: {
      patientProfileId?: string | null | undefined;
      doctorProfileId?: string | null | undefined;
    };
    now: Date;
  }): Promise<GetVideoSessionResult>;
  markRemindersSent(
    appointmentId: string,
    reminder24hSent: boolean,
    reminder30minSent: boolean,
  ): Promise<void>;
}
