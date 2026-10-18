import { AppError } from "../../common/errors/app-error";
import type { AppointmentRepository } from "./appointment.repository";

const HOLD_DURATION_MILLISECONDS = 10 * 60 * 1000;
const MINIMUM_BOOKING_LEAD_MILLISECONDS = 60 * 60 * 1000;

export class AppointmentService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

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

  async bookAppointment(patientProfileId: string, holdId: string) {
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
    return result.appointment;
  }

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

  listMyAppointments(patientProfileId: string) {
    return this.repository.listPatientAppointments(patientProfileId);
  }
}
