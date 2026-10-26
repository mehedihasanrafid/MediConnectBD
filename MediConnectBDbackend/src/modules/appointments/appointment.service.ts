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

const HOLD_DURATION_MILLISECONDS = 10 * 60 * 1000;
const MINIMUM_BOOKING_LEAD_MILLISECONDS = 60 * 60 * 1000;

export class AppointmentService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly notificationService?: NotificationService | null,
    private readonly now: () => Date = () => new Date(),
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
    patientEmail?: string,
    doctorName?: string,
  ) {
    const result = await this.repository.bookHold({
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
    if (result.kind === "HOLD_EXPIRED") {
      throw new AppError(409, "HOLD_EXPIRED", "The appointment hold has expired");
    }
    if (result.kind === "HOLD_NOT_ACTIVE") {
      throw new AppError(409, "HOLD_NOT_ACTIVE", "The appointment hold is no longer active");
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

  listMyAppointments(patientProfileId: string) {
    return this.repository.listPatientAppointments(patientProfileId);
  }
}
