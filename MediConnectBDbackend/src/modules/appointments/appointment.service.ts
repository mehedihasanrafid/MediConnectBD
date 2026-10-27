/**
 * Applies the ten-minute hold and one-hour booking lead-time policies and maps repository outcomes
 * to stable API errors. The injected clock supports exact expiry tests; the repository owns
 * concurrency decisions. Optionally sends booking confirmation emails via NotificationService.
 */

import { AppError } from "../../utils/app-error";
import { AppointmentStatus } from "./appointment.entity";
import type { AppointmentRepository } from "./appointment.repository";
import type { CancellationActor } from "./cancellation-policy";
import type { NotificationService } from "../notifications/notification-service";
import { MockVideoProvider, type VideoProvider } from "./video-provider";
import type { VideoSessionView } from "./appointment.types";

const HOLD_DURATION_MILLISECONDS = 10 * 60 * 1000;
const MINIMUM_BOOKING_LEAD_MILLISECONDS = 60 * 60 * 1000;

export class AppointmentService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly notificationService?: NotificationService | null,
    private readonly now: () => Date = () => new Date(),
    private readonly videoProvider?: VideoProvider | null,
  ) {}

  /**
   * Uses one captured server time for the ten-minute expiry and one-hour minimum start boundary.
   */
  async holdSlot(patientProfileId: string, slotId: string) {
    const now = this.now();
    const result = await this.repository.createHold({
      slotId,
      patientProfileId,
      now,
      expiresAt: new Date(now.getTime() + HOLD_DURATION_MILLISECONDS),
      minimumStartAt: new Date(now.getTime() + MINIMUM_BOOKING_LEAD_MILLISECONDS),
    });

    if (result.kind === "SLOT_NOT_FOUND") {
      throw new AppError(404, "SLOT_NOT_FOUND", "Appointment slot was not found");
    }
    if (result.kind === "SLOT_UNAVAILABLE") {
      throw new AppError(409, "SLOT_UNAVAILABLE", "This appointment slot is no longer available");
    }
    if (result.kind === "BOOKING_TOO_LATE") {
      throw new AppError(
        409,
        "BOOKING_LEAD_TIME_REQUIRED",
        "Appointments must be booked at least one hour before the start time",
      );
    }
    if (result.kind === "PATIENT_OVERLAP") {
      throw new AppError(
        409,
        "PATIENT_APPOINTMENT_OVERLAP",
        "You already have another appointment or active hold at an overlapping time",
      );
    }
    return result.hold;
  }

  /**
   * Maps explicit repository outcomes into the booking API while preserving the distinction
   * between chamber confirmation and video payment pending. Sends a confirmation email for
   * chamber bookings (video payments remain PENDING_PAYMENT until verified).
   */
  async bookAppointment(
    patientProfileId: string,
    holdId: string,
    familyMemberId?: string | null,
    patientEmail?: string,
    doctorName?: string,
  ) {
    const result = await this.repository.bookHold({
      holdId,
      patientProfileId,
      familyMemberId,
      now: this.now(),
    });
    if (result.kind === "HOLD_NOT_FOUND") {
      throw new AppError(404, "HOLD_NOT_FOUND", "Appointment hold was not found");
    }
    if (result.kind === "HOLD_FORBIDDEN") {
      throw new AppError(403, "HOLD_FORBIDDEN", "This hold belongs to another patient");
    }
    if (result.kind === "HOLD_EXPIRED") {
      throw new AppError(409, "HOLD_EXPIRED", "The appointment hold has expired");
    }
    if (result.kind === "HOLD_NOT_ACTIVE") {
      throw new AppError(409, "HOLD_NOT_ACTIVE", "The appointment hold is no longer active");
    }
    if (result.kind === "FAMILY_MEMBER_NOT_FOUND") {
      throw new AppError(404, "FAMILY_MEMBER_NOT_FOUND", "Family member was not found");
    }
    if (result.kind === "PATIENT_OVERLAP") {
      throw new AppError(
        409,
        "PATIENT_APPOINTMENT_OVERLAP",
        "You already have another appointment or active hold at an overlapping time",
      );
    }

    // Send confirmation email for chamber bookings only (video stays PENDING_PAYMENT)
    if (
      this.notificationService &&
      result.appointment.status === AppointmentStatus.CONFIRMED &&
      patientEmail &&
      doctorName
    ) {
      try {
        await this.notificationService.sendBookingConfirmation(
          patientEmail,
          result.appointment.id,
          doctorName,
          result.appointment.scheduledStartAt,
          result.appointment.feeAmount,
        );
      } catch (error) {
        // Log but don't fail the booking if email fails
        console.error({ error }, "Failed to send booking confirmation email");
      }
    }

    return result.appointment;
  }

  /**
   * Requires patient ownership and treats an already closed hold as an idempotent release.
   */
  async releaseHold(patientProfileId: string, holdId: string): Promise<void> {
    const result = await this.repository.releaseHold({
      holdId,
      patientProfileId,
      now: this.now(),
    });
    if (result.kind === "HOLD_NOT_FOUND") {
      throw new AppError(404, "HOLD_NOT_FOUND", "Appointment hold was not found");
    }
    if (result.kind === "HOLD_FORBIDDEN") {
      throw new AppError(403, "HOLD_FORBIDDEN", "This hold belongs to another patient");
    }
  }

  /**
   * Cancels a booking and reports the refund decision. Repeating the call is idempotent: an
   * already-cancelled appointment returns its current state instead of an error.
   */
  async cancelAppointment(
    actor: CancellationActor,
    actorId: string,
    appointmentId: string,
    reason: string,
  ) {
    const result = await this.repository.cancelAppointment({
      appointmentId,
      actor,
      actorId,
      reason,
      now: this.now(),
    });
    if (result.kind === "APPOINTMENT_NOT_FOUND") {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
    }
    if (result.kind === "APPOINTMENT_FORBIDDEN") {
      throw new AppError(403, "APPOINTMENT_FORBIDDEN", "This appointment belongs to another patient");
    }
    if (result.kind === "APPOINTMENT_NOT_CANCELLABLE") {
      throw new AppError(
        409,
        "APPOINTMENT_NOT_CANCELLABLE",
        "Only a confirmed or pending-payment appointment can be cancelled",
      );
    }
    return result.outcome;
  }

  async rescheduleAppointment(
    patientProfileId: string,
    appointmentId: string,
    newSlotId: string,
  ) {
    const now = this.now();
    const result = await this.repository.rescheduleAppointment({
      appointmentId,
      patientProfileId,
      newSlotId,
      now,
      minimumStartAt: new Date(now.getTime() + MINIMUM_BOOKING_LEAD_MILLISECONDS),
    });
    if (result.kind === "APPOINTMENT_NOT_FOUND") {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
    }
    if (result.kind === "APPOINTMENT_FORBIDDEN") {
      throw new AppError(403, "APPOINTMENT_FORBIDDEN", "This appointment belongs to another patient");
    }
    if (result.kind === "APPOINTMENT_NOT_RESCHEDULABLE") {
      throw new AppError(
        409,
        "APPOINTMENT_NOT_RESCHEDULABLE",
        "Only an upcoming confirmed or pending-payment appointment at least 1 hour away can be rescheduled",
      );
    }
    if (result.kind === "SLOT_NOT_FOUND") {
      throw new AppError(404, "SLOT_NOT_FOUND", "Target appointment slot was not found");
    }
    if (result.kind === "SLOT_MISMATCH") {
      throw new AppError(
        409,
        "SLOT_MISMATCH",
        "You can only reschedule to a slot with the same doctor and consultation mode",
      );
    }
    if (result.kind === "BOOKING_TOO_LATE") {
      throw new AppError(
        409,
        "BOOKING_LEAD_TIME_REQUIRED",
        "Appointments must be rescheduled to a slot at least one hour in the future",
      );
    }
    if (result.kind === "SLOT_UNAVAILABLE") {
      throw new AppError(409, "SLOT_UNAVAILABLE", "The selected slot is no longer available");
    }
    if (result.kind === "PATIENT_OVERLAP") {
      throw new AppError(
        409,
        "PATIENT_APPOINTMENT_OVERLAP",
        "You already have another appointment or active hold at an overlapping time",
      );
    }
    return result.appointment;
  }

  listMyAppointments(patientProfileId: string) {
    return this.repository.listPatientAppointments(patientProfileId);
  }

  listDoctorAppointments(doctorProfileId: string) {
    return this.repository.listDoctorAppointments(doctorProfileId);
  }

  /**
   * Transitions a doctor's own CONFIRMED appointment to COMPLETED so that prescriptions and
   * patient reviews can be unlocked. Repeating the call on an already-completed appointment is idempotent.
   */
  async completeAppointment(doctorProfileId: string, appointmentId: string) {
    const result = await this.repository.transitionAppointmentStatus({
      appointmentId,
      doctorProfileId,
      targetStatus: AppointmentStatus.COMPLETED,
      now: this.now(),
    });
    if (result.kind === "APPOINTMENT_NOT_FOUND") {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
    }
    if (result.kind === "APPOINTMENT_FORBIDDEN") {
      throw new AppError(403, "APPOINTMENT_FORBIDDEN", "This appointment belongs to another doctor");
    }
    if (result.kind === "APPOINTMENT_INVALID_STATE") {
      throw new AppError(
        409,
        "APPOINTMENT_NOT_CONFIRMED",
        "Only a confirmed appointment can be marked as completed",
      );
    }
    return result.appointment;
  }

  /**
   * Transitions a doctor's own CONFIRMED appointment to NO_SHOW when the patient does not attend.
   * Repeating the call on an already-marked no-show appointment is idempotent.
   */
  async markNoShow(doctorProfileId: string, appointmentId: string) {
    const result = await this.repository.transitionAppointmentStatus({
      appointmentId,
      doctorProfileId,
      targetStatus: AppointmentStatus.NO_SHOW,
      now: this.now(),
    });
    if (result.kind === "APPOINTMENT_NOT_FOUND") {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
    }
    if (result.kind === "APPOINTMENT_FORBIDDEN") {
      throw new AppError(403, "APPOINTMENT_FORBIDDEN", "This appointment belongs to another doctor");
    }
    if (result.kind === "APPOINTMENT_INVALID_STATE") {
      throw new AppError(
        409,
        "APPOINTMENT_NOT_CONFIRMED",
        "Only a confirmed appointment can be marked as no-show",
      );
    }
    return result.appointment;
  }

  async getVideoSession(
    appointmentId: string,
    actor: {
      patientProfileId?: string | null | undefined;
      doctorProfileId?: string | null | undefined;
    },
  ): Promise<VideoSessionView> {
    if (this.repository.getAppointmentForVideoSession) {
      const eligibility = await this.repository.getAppointmentForVideoSession({
        appointmentId,
        actor,
        now: this.now(),
      });
      if (eligibility.kind === "APPOINTMENT_NOT_FOUND") {
        throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
      }
      if (eligibility.kind === "APPOINTMENT_FORBIDDEN") {
        throw new AppError(
          403,
          "APPOINTMENT_FORBIDDEN",
          "Only the booked patient or assigned doctor can join this video consultation",
        );
      }
      if (eligibility.kind === "VIDEO_NOT_APPLICABLE") {
        throw new AppError(
          409,
          "VIDEO_SESSION_NOT_APPLICABLE",
          "Video session is only available for video consultations",
        );
      }
      if (eligibility.kind === "VIDEO_NOT_CONFIRMED") {
        throw new AppError(
          409,
          "VIDEO_SESSION_NOT_CONFIRMED",
          "Video session is only available for confirmed appointments",
        );
      }
      if (eligibility.kind === "VIDEO_WINDOW_CLOSED") {
        throw new AppError(
          409,
          "VIDEO_SESSION_WINDOW_CLOSED",
          "Video room opens 5 minutes before the scheduled start time and closes when the slot ends",
          {
            opensAt: eligibility.opensAt,
            closesAt: eligibility.closesAt,
            scheduledStartAt: eligibility.scheduledStartAt,
            scheduledEndAt: eligibility.scheduledEndAt,
          },
        );
      }

      const videoProvider = this.videoProvider ?? new MockVideoProvider();
      const roomName = `mediconnect-consult-${eligibility.details.appointmentId}`;
      const credentials = await videoProvider.createSession({
        appointmentId: eligibility.details.appointmentId,
        roomName,
        opensAt: eligibility.details.opensAt,
        closesAt: eligibility.details.closesAt,
        participant: {
          identity: eligibility.details.participantIdentity,
          name: eligibility.details.participantName,
          role: eligibility.details.participantRole,
          isOwner: eligibility.details.participantRole === "DOCTOR",
        },
      });

      return {
        appointmentId: eligibility.details.appointmentId,
        roomName: credentials.roomName,
        roomUrl: credentials.roomUrl,
        accessToken: credentials.accessToken,
        participantRole: eligibility.details.participantRole,
        participantName: eligibility.details.participantName,
        doctorName: eligibility.details.doctorName,
        patientName: eligibility.details.patientName,
        scheduledStartAt: eligibility.details.scheduledStartAt,
        scheduledEndAt: eligibility.details.scheduledEndAt,
        opensAt: eligibility.details.opensAt,
        closesAt: eligibility.details.closesAt,
      };
    }

    if (!this.repository.getVideoSession) {
      throw new AppError(501, "VIDEO_SESSION_NOT_SUPPORTED", "Video sessions are not configured");
    }
    const result = await this.repository.getVideoSession({
      appointmentId,
      actor,
      now: this.now(),
    });
    if (result.kind === "APPOINTMENT_NOT_FOUND") {
      throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found");
    }
    if (result.kind === "APPOINTMENT_FORBIDDEN") {
      throw new AppError(
        403,
        "APPOINTMENT_FORBIDDEN",
        "Only the booked patient or assigned doctor can join this video consultation",
      );
    }
    if (result.kind === "VIDEO_NOT_APPLICABLE") {
      throw new AppError(
        409,
        "VIDEO_SESSION_NOT_APPLICABLE",
        "Video session is only available for video consultations",
      );
    }
    if (result.kind === "VIDEO_NOT_CONFIRMED") {
      throw new AppError(
        409,
        "VIDEO_SESSION_NOT_CONFIRMED",
        "Video session is only available for confirmed appointments",
      );
    }
    if (result.kind === "VIDEO_WINDOW_CLOSED") {
      throw new AppError(
        409,
        "VIDEO_SESSION_WINDOW_CLOSED",
        "Video room opens 5 minutes before the scheduled start time and closes when the slot ends",
        {
          opensAt: result.opensAt,
          closesAt: result.closesAt,
          scheduledStartAt: result.scheduledStartAt,
          scheduledEndAt: result.scheduledEndAt,
        },
      );
    }
    return result.session;
  }
}
