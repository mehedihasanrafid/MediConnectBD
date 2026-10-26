/**
 * Atomic hold/booking persistence. Availability decisions run under database locks, not in a
 * browser check. Chamber bookings confirm immediately; video bookings retain an expiring hold
 * until verified payment confirms them.
 */

import type { DataSource, EntityManager } from "typeorm";
import {
  Appointment,
  AppointmentStatus,
} from "./appointment.entity";
import {
  AppointmentSlot,
  AppointmentSlotStatus,
} from "../scheduling/appointment-slot.entity";
import { ConsultationMode } from "./consultation-mode";
import { SlotHold, SlotHoldStatus } from "./slot-hold.entity";
import type { AppointmentRepository } from "./appointment.repository";import type {
  AppointmentView,
  BookingSlotView,
  BookHoldResult,
  CancelAppointmentResult,
  CreateHoldResult,
  DoctorAppointmentView,
  ReleaseHoldResult,
  SlotHoldView,
  TransitionAppointmentStatusResult,
} from "./appointment.types";
import { decideRefund, refundAmountFor, type CancellationActor } from "./cancellation-policy";
import { Payment } from "../payments/payment.entity";
import { Refund } from "../payments/refund.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import type { NotificationService } from "../notifications/notification-service";

export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationService?: NotificationService | null,
  ) {}

  /**
   * Locks the selected slot before checking its state. A retry by the same patient can reuse an
   * active hold; another patient gets a conflict.
   */
  async createHold(input: {
    slotId: string;
    patientProfileId: string;
    now: Date;
    expiresAt: Date;
    minimumStartAt: Date;
  }): Promise<CreateHoldResult> {
    return this.dataSource.transaction(async (manager) => {
      const slots = manager.getRepository(AppointmentSlot);
      const slot = await slots.findOne({
        where: { id: input.slotId },
        relations: { chamber: { hospital: true } },
        lock: { mode: "pessimistic_write" },
      });
      if (!slot) return { kind: "SLOT_NOT_FOUND" };
      if (slot.startAt < input.minimumStartAt) return { kind: "BOOKING_TOO_LATE" };

      if (slot.status === AppointmentSlotStatus.HELD) {
        if (slot.heldUntil && slot.heldUntil <= input.now) {
          await this.expireSlot(manager, slot, input.now);
        } else {
          const existing = await manager.getRepository(SlotHold).findOne({
            where: {
              slotId: slot.id,
              patientProfileId: input.patientProfileId,
              status: SlotHoldStatus.ACTIVE,
            },
          });
          if (existing && existing.expiresAt > input.now) {
            return { kind: "EXISTING", hold: this.toHold(existing, slot) };
          }
          return { kind: "SLOT_UNAVAILABLE" };
        }
      }

      if (slot.status !== AppointmentSlotStatus.AVAILABLE) {
        return { kind: "SLOT_UNAVAILABLE" };
      }

      slot.status = AppointmentSlotStatus.HELD;
      slot.heldUntil = input.expiresAt;
      await slots.save(slot);

      const holds = manager.getRepository(SlotHold);
      const hold = await holds.save(
        holds.create({
          slotId: slot.id,
          patientProfileId: input.patientProfileId,
          status: SlotHoldStatus.ACTIVE,
          expiresAt: input.expiresAt,
          releasedAt: null,
        }),
      );
      return { kind: "CREATED", hold: this.toHold(hold, slot) };
    });
  }

  /**
   * Locks hold/slot and checks ownership and expiry before creating a booking. Existing eligible
   * retries reuse the hold-linked appointment.
   */
  async bookHold(input: {
    holdId: string;
    patientProfileId: string;
    now: Date;
  }): Promise<BookHoldResult> {
    const result = await this.dataSource.transaction<BookHoldResult>(async (manager) => {
      const holds = manager.getRepository(SlotHold);
      const hold = await holds.findOne({
        where: { id: input.holdId },
        lock: { mode: "pessimistic_write" },
      });
      if (!hold) return { kind: "HOLD_NOT_FOUND" };
      if (hold.patientProfileId !== input.patientProfileId) {
        return { kind: "HOLD_FORBIDDEN" };
      }

      const slots = manager.getRepository(AppointmentSlot);
      const slot = await slots.findOne({
        where: { id: hold.slotId },
        relations: { chamber: { hospital: true } },
        lock: { mode: "pessimistic_write" },
      });
      if (!slot) return { kind: "HOLD_NOT_ACTIVE" };

      const appointments = manager.getRepository(Appointment);
      const existing = await appointments.findOne({
        where: { holdId: hold.id },
        relations: { slot: { chamber: { hospital: true } } },
      });
      if (hold.status === SlotHoldStatus.CONVERTED && existing) {
        return { kind: "EXISTING", appointment: this.toAppointment(existing) };
      }
      if (hold.status !== SlotHoldStatus.ACTIVE) {
        return { kind: "HOLD_NOT_ACTIVE" };
      }
      if (hold.expiresAt <= input.now || !slot.heldUntil || slot.heldUntil <= input.now) {
        await this.expireSlot(manager, slot, input.now);
        return { kind: "HOLD_EXPIRED" };
      }
      if (existing) {
        return { kind: "EXISTING", appointment: this.toAppointment(existing) };
      }
      if (slot.status !== AppointmentSlotStatus.HELD) {
        return { kind: "HOLD_NOT_ACTIVE" };
      }

      const isVideo = slot.mode === ConsultationMode.VIDEO;
      const appointment = await appointments.save(
        appointments.create({
          slotId: slot.id,
          holdId: hold.id,
          patientProfileId: input.patientProfileId,
          doctorProfileId: slot.doctorProfileId,
          scheduledStartAt: slot.startAt,
          scheduledEndAt: slot.endAt,
          mode: slot.mode,
          feeAmount: slot.feeAmount,
          status: isVideo
            ? AppointmentStatus.PENDING_PAYMENT
            : AppointmentStatus.CONFIRMED,
          paymentReference: null,
          cancellationReason: null,
        }),
      );

      // Video keeps the original expiry; creating an unpaid appointment must not book the slot permanently.
      if (!isVideo) {
        hold.status = SlotHoldStatus.CONVERTED;
        hold.releasedAt = input.now;
        slot.status = AppointmentSlotStatus.BOOKED;
        slot.heldUntil = null;
        await Promise.all([holds.save(hold), slots.save(slot)]);
      }

      appointment.slot = slot;
      return { kind: "BOOKED", appointment: this.toAppointment(appointment) };
    });

    if (
      result.kind === "BOOKED" &&
      result.appointment.status === AppointmentStatus.CONFIRMED &&
      this.notificationService
    ) {
      await this.notifyConfirmedBooking(result.appointment).catch((error: unknown) => {
        console.error({ error }, "Failed to send booking confirmation email");
      });
    }

    return result;
  }

  private async notifyConfirmedBooking(appointment: AppointmentView): Promise<void> {
    if (!this.notificationService) return;
    const [patient, doctor] = await Promise.all([
      this.dataSource.getRepository(PatientProfile).findOne({
        where: { id: appointment.patientProfileId },
        relations: { user: true },
      }),
      this.dataSource.getRepository(DoctorProfile).findOne({
        where: { id: appointment.doctorId },
        relations: { user: true },
      }),
    ]);
    if (!patient?.user?.email || !doctor?.user) return;
    const doctorName = `${doctor.user.firstName} ${doctor.user.lastName}`.trim();
    await this.notificationService.sendBookingConfirmation(
      patient.user.email,
      appointment.id,
      doctorName,
      appointment.scheduledStartAt,
      appointment.feeAmount,
    );
  }

  /**
   * Sends a booking confirmation email after a chamber appointment is confirmed.
   */
  async sendBookingConfirmation(
    patientEmail: string,
    appointmentId: string,
    doctorName: string,
    scheduledAt: Date,
    feeAmount: number,
  ): Promise<void> {
    if (!this.notificationService) return;
    await this.notificationService.sendBookingConfirmation(
      patientEmail,
      appointmentId,
      doctorName,
      scheduledAt,
      feeAmount,
    );
  }

  /**
   * Marks reminder flags on an appointment after sending notifications.
   */
  async markRemindersSent(
    appointmentId: string,
    reminder24hSent: boolean,
    reminder30minSent: boolean,
  ): Promise<void> {
    await this.dataSource.getRepository(Appointment).update(
      { id: appointmentId },
      { reminder24hSent, reminder30minSent },
    );
  }

  /**
   * Releases the patient's active hold and cancels its unpaid appointment in the same transaction.
   */
  async releaseHold(input: {
    holdId: string;
    patientProfileId: string;
    now: Date;
  }): Promise<ReleaseHoldResult> {
    return this.dataSource.transaction(async (manager) => {
      const holds = manager.getRepository(SlotHold);
      const hold = await holds.findOne({
        where: { id: input.holdId },
        lock: { mode: "pessimistic_write" },
      });
      if (!hold) return { kind: "HOLD_NOT_FOUND" };
      if (hold.patientProfileId !== input.patientProfileId) {
        return { kind: "HOLD_FORBIDDEN" };
      }
      if (hold.status !== SlotHoldStatus.ACTIVE) return { kind: "ALREADY_CLOSED" };

      const slot = await manager.getRepository(AppointmentSlot).findOne({
        where: { id: hold.slotId },
        lock: { mode: "pessimistic_write" },
      });
      hold.status = SlotHoldStatus.RELEASED;
      hold.releasedAt = input.now;
      await holds.save(hold);
      await manager.getRepository(Appointment).update(
        { holdId: hold.id, status: AppointmentStatus.PENDING_PAYMENT },
        {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: "Patient released the payment hold",
        },
      );
      if (slot?.status === AppointmentSlotStatus.HELD) {
        slot.status = AppointmentSlotStatus.AVAILABLE;
        slot.heldUntil = null;
        await manager.getRepository(AppointmentSlot).save(slot);
      }
      return { kind: "RELEASED" };
    });
  }

  /**
   * Cancels an appointment under row locks, releases its slot, and records a refund request. The
   * refund row is a request only; no provider refund is executed here. Repeating the call for an
   * already-cancelled appointment is idempotent and creates no second refund.
   */
  async cancelAppointment(input: {
    appointmentId: string;
    actor: CancellationActor;
    actorId: string;
    reason: string;
    now: Date;
  }): Promise<CancelAppointmentResult> {
    return this.dataSource.transaction(async (manager) => {
      const appointments = manager.getRepository(Appointment);
      const appointment = await appointments.findOne({
        where: { id: input.appointmentId },
        relations: { slot: { chamber: { hospital: true } } },
        lock: { mode: "pessimistic_write" },
      });
      if (!appointment) return { kind: "APPOINTMENT_NOT_FOUND" };

      // A patient may only cancel their own booking; a doctor may only cancel their assigned booking; admins act on any booking.
      if (input.actor === "PATIENT" && appointment.patientProfileId !== input.actorId) {
        return { kind: "APPOINTMENT_FORBIDDEN" };
      }
      if (input.actor === "DOCTOR" && appointment.doctorProfileId !== input.actorId) {
        return { kind: "APPOINTMENT_FORBIDDEN" };
      }

      const decision = decideRefund(input.actor, appointment.scheduledStartAt, input.now);

      if (appointment.status === AppointmentStatus.CANCELLED) {
        return {
          kind: "ALREADY_CANCELLED",
          outcome: {
            appointment: this.toAppointment(appointment),
            refundPercent: decision.refundPercent,
            refundAmount: "0.00",
            refundId: null,
          },
        };
      }

      // Only a live booking can be cancelled; completed and no-show visits are historical.
      if (
        appointment.status !== AppointmentStatus.CONFIRMED &&
        appointment.status !== AppointmentStatus.PENDING_PAYMENT
      ) {
        return { kind: "APPOINTMENT_NOT_CANCELLABLE" };
      }

      appointment.status = AppointmentStatus.CANCELLED;
      appointment.cancellationReason = input.reason;
      await appointments.save(appointment);

      const slot = await manager.getRepository(AppointmentSlot).findOne({
        where: { id: appointment.slotId },
        lock: { mode: "pessimistic_write" },
      });
      // A confirmed booking owns the slot; an unpaid video booking still holds it. Free either.
      if (slot && slot.status !== AppointmentSlotStatus.BLOCKED) {
        slot.status = AppointmentSlotStatus.AVAILABLE;
        slot.heldUntil = null;
        await manager.getRepository(AppointmentSlot).save(slot);
      }
      await manager.getRepository(SlotHold).update(
        { id: appointment.holdId, status: SlotHoldStatus.ACTIVE },
        { status: SlotHoldStatus.RELEASED, releasedAt: input.now },
      );

      // A refund is only meaningful against a captured payment.
      const payment = await manager.getRepository(Payment).findOne({
        where: { appointmentId: appointment.id },
        lock: { mode: "pessimistic_write" },
      });
      let refundId: string | null = null;
      let refundAmount = "0.00";
      if (payment && payment.status === "SUCCEEDED" && decision.refundPercent > 0) {
        refundAmount = refundAmountFor(payment.amount, decision.refundPercent);
        const refund = await manager.getRepository(Refund).save(
          manager.getRepository(Refund).create({
            paymentId: payment.id,
            refundTransactionId: `RF${input.now.getTime()}${Math.floor(Math.random() * 1000)}`,
            amount: refundAmount,
            status: "REQUESTED",
            reason: decision.reason,
            providerReference: null,
          }),
        );
        refundId = refund.id;
      }

      return {
        kind: "CANCELLED",
        outcome: {
          appointment: this.toAppointment(appointment),
          refundPercent: decision.refundPercent,
          refundAmount,
          refundId,
        },
      };
    });
  }

  async transitionAppointmentStatus(input: {
    appointmentId: string;
    doctorProfileId: string;
    targetStatus: AppointmentStatus.COMPLETED | AppointmentStatus.NO_SHOW;
    now: Date;
  }): Promise<TransitionAppointmentStatusResult> {
    return this.dataSource.transaction(async (manager) => {
      const appointments = manager.getRepository(Appointment);
      const appointment = await appointments.findOne({
        where: { id: input.appointmentId },
        relations: { slot: { chamber: { hospital: true } } },
        lock: { mode: "pessimistic_write" },
      });
      if (!appointment) return { kind: "APPOINTMENT_NOT_FOUND" };
      if (appointment.doctorProfileId !== input.doctorProfileId) {
        return { kind: "APPOINTMENT_FORBIDDEN" };
      }
      if (appointment.status === input.targetStatus) {
        return {
          kind: "ALREADY_IN_STATUS",
          appointment: this.toAppointment(appointment),
        };
      }
      if (appointment.status !== AppointmentStatus.CONFIRMED) {
        return { kind: "APPOINTMENT_INVALID_STATE" };
      }

      appointment.status = input.targetStatus;
      const saved = await appointments.save(appointment);
      saved.slot = appointment.slot;
      return { kind: "UPDATED", appointment: this.toAppointment(saved) };
    });
  }

  async listPatientAppointments(patientProfileId: string): Promise<AppointmentView[]> {
    const appointments = await this.dataSource.getRepository(Appointment).find({
      where: { patientProfileId },
      relations: { slot: { chamber: { hospital: true } } },
      order: { scheduledStartAt: "ASC", id: "ASC" },
    });
    return appointments.map((appointment) => this.toAppointment(appointment));
  }

  async listDoctorAppointments(doctorProfileId: string): Promise<DoctorAppointmentView[]> {
    const appointments = await this.dataSource.getRepository(Appointment).find({
      where: { doctorProfileId },
      relations: {
        slot: { chamber: { hospital: true } },
        patientProfile: { user: true },
      },
      order: { scheduledStartAt: "ASC", id: "ASC" },
    });
    return appointments.map((appointment) => ({
      ...this.toAppointment(appointment),
      patient: appointment.patientProfile?.user
        ? {
            id: appointment.patientProfile.id,
            firstName: appointment.patientProfile.user.firstName,
            lastName: appointment.patientProfile.user.lastName,
            email: appointment.patientProfile.user.email,
            phone: appointment.patientProfile.phone,
          }
        : null,
    }));
  }

  /**
   * Expires active holds and pending-payment appointments for the locked slot before making it
   * available again.
   */
  private async expireSlot(
    manager: EntityManager,
    slot: AppointmentSlot,
    now: Date,
  ): Promise<void> {
    await manager
      .getRepository(SlotHold)
      .createQueryBuilder()
      .update()
      .set({ status: SlotHoldStatus.EXPIRED, releasedAt: now })
      .where("slot_id = :slotId AND status = :status", {
        slotId: slot.id,
        status: SlotHoldStatus.ACTIVE,
      })
      .execute();
    await manager
      .getRepository(Appointment)
      .createQueryBuilder()
      .update()
      .set({
        status: AppointmentStatus.PAYMENT_EXPIRED,
        cancellationReason: "Payment hold expired",
      })
      .where("slot_id = :slotId AND status = :status", {
        slotId: slot.id,
        status: AppointmentStatus.PENDING_PAYMENT,
      })
      .execute();
    slot.status = AppointmentSlotStatus.AVAILABLE;
    slot.heldUntil = null;
    await manager.getRepository(AppointmentSlot).save(slot);
  }

  private toHold(hold: SlotHold, slot: AppointmentSlot): SlotHoldView {
    return {
      id: hold.id,
      patientProfileId: hold.patientProfileId,
      status: hold.status,
      expiresAt: hold.expiresAt,
      createdAt: hold.createdAt,
      slot: this.toSlot(slot),
    };
  }

  private toAppointment(appointment: Appointment): AppointmentView {
    return {
      id: appointment.id,
      patientProfileId: appointment.patientProfileId,
      doctorId: appointment.doctorProfileId,
      holdId: appointment.holdId,
      status: appointment.status,
      scheduledStartAt: appointment.scheduledStartAt,
      scheduledEndAt: appointment.scheduledEndAt,
      mode: appointment.mode,
      feeAmount: Number(appointment.feeAmount),
      paymentRequired:
        appointment.mode === ConsultationMode.VIDEO &&
        appointment.status === AppointmentStatus.PENDING_PAYMENT,
      paymentReference: appointment.paymentReference,
      cancellationReason: appointment.cancellationReason,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      slot: this.toSlot(appointment.slot),
    };
  }

  private toSlot(slot: AppointmentSlot): BookingSlotView {
    return {
      id: slot.id,
      doctorId: slot.doctorProfileId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      mode: slot.mode,
      feeAmount: Number(slot.feeAmount),
      chamber:
        slot.chamber && slot.chamber.hospital
          ? {
              id: slot.chamber.id,
              roomOrUnit: slot.chamber.roomOrUnit,
              hospital: {
                id: slot.chamber.hospital.id,
                name: slot.chamber.hospital.name,
                area: slot.chamber.hospital.area,
                address: slot.chamber.hospital.address,
              },
            }
          : null,
    };
  }
}
