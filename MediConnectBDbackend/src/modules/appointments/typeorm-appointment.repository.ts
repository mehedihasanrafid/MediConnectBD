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
import type { AppointmentRepository } from "./appointment.repository";
import type {
  AppointmentView,
  AppointmentVideoEligibilityResult,
  BookingSlotView,
  BookHoldResult,
  CancelAppointmentResult,
  CreateHoldResult,
  DoctorAppointmentView,
  ReleaseHoldResult,
  RescheduleAppointmentResult,
  SlotHoldView,
  TransitionAppointmentStatusResult,
} from "./appointment.types";
import { decideRefund, refundAmountFor, type CancellationActor } from "./cancellation-policy";
import { Payment } from "../payments/payment.entity";
import { Refund } from "../payments/refund.entity";
import { FamilyMember } from "../patients/family-member.entity";
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

      const hasOverlap = await this.hasOverlappingBookingOrHold(
        manager,
        input.patientProfileId,
        slot.startAt,
        slot.endAt,
        input.now,
        slot.id,
      );
      if (hasOverlap) {
        return { kind: "PATIENT_OVERLAP" };
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
    familyMemberId?: string | null | undefined;
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

      let familyMember: FamilyMember | null = null;
      if (input.familyMemberId) {
        familyMember = await manager.getRepository(FamilyMember).findOne({
          where: { id: input.familyMemberId, patientProfileId: input.patientProfileId },
        });
        if (!familyMember) {
          return { kind: "FAMILY_MEMBER_NOT_FOUND" };
        }
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
        relations: { slot: { chamber: { hospital: true } }, familyMember: true },
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

      const hasOverlap = await this.hasOverlappingBookingOrHold(
        manager,
        input.patientProfileId,
        slot.startAt,
        slot.endAt,
        input.now,
        slot.id,
      );
      if (hasOverlap) {
        return { kind: "PATIENT_OVERLAP" };
      }

      const isVideo = slot.mode === ConsultationMode.VIDEO;
      const appointment = await appointments.save(
        appointments.create({
          slotId: slot.id,
          holdId: hold.id,
          patientProfileId: input.patientProfileId,
          familyMemberId: familyMember ? familyMember.id : null,
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
      appointment.familyMember = familyMember;
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
      if (input.targetStatus === AppointmentStatus.COMPLETED) appointment.completedAt ??= input.now;
      const saved = await appointments.save(appointment);
      saved.slot = appointment.slot;
      return { kind: "UPDATED", appointment: this.toAppointment(saved) };
    });
  }

  async rescheduleAppointment(input: {
    appointmentId: string;
    patientProfileId: string;
    newSlotId: string;
    now: Date;
    minimumStartAt: Date;
  }): Promise<RescheduleAppointmentResult> {
    return this.dataSource.transaction(async (manager) => {
      const appointments = manager.getRepository(Appointment);
      const appointment = await appointments.findOne({
        where: { id: input.appointmentId },
        relations: { slot: { chamber: { hospital: true } }, familyMember: true },
        lock: { mode: "pessimistic_write" },
      });
      if (!appointment) return { kind: "APPOINTMENT_NOT_FOUND" };
      if (appointment.patientProfileId !== input.patientProfileId) {
        return { kind: "APPOINTMENT_FORBIDDEN" };
      }

      if (
        (appointment.status !== AppointmentStatus.CONFIRMED &&
          appointment.status !== AppointmentStatus.PENDING_PAYMENT) ||
        appointment.scheduledStartAt < input.minimumStartAt
      ) {
        return { kind: "APPOINTMENT_NOT_RESCHEDULABLE" };
      }

      if (appointment.slotId === input.newSlotId) {
        return { kind: "RESCHEDULED", appointment: this.toAppointment(appointment) };
      }

      const slots = manager.getRepository(AppointmentSlot);
      const newSlot = await slots.findOne({
        where: { id: input.newSlotId },
        relations: { chamber: { hospital: true } },
        lock: { mode: "pessimistic_write" },
      });
      if (!newSlot) return { kind: "SLOT_NOT_FOUND" };
      if (
        newSlot.doctorProfileId !== appointment.doctorProfileId ||
        newSlot.mode !== appointment.mode
      ) {
        return { kind: "SLOT_MISMATCH" };
      }
      if (newSlot.startAt < input.minimumStartAt) {
        return { kind: "BOOKING_TOO_LATE" };
      }

      if (newSlot.status === AppointmentSlotStatus.HELD && newSlot.heldUntil && newSlot.heldUntil <= input.now) {
        await this.expireSlot(manager, newSlot, input.now);
      }

      if (newSlot.status !== AppointmentSlotStatus.AVAILABLE) {
        return { kind: "SLOT_UNAVAILABLE" };
      }

      const hasOverlap = await this.hasOverlappingBookingOrHold(
        manager,
        input.patientProfileId,
        newSlot.startAt,
        newSlot.endAt,
        input.now,
        newSlot.id,
        appointment.id,
      );
      if (hasOverlap) {
        return { kind: "PATIENT_OVERLAP" };
      }

      const oldSlot = await slots.findOne({
        where: { id: appointment.slotId },
        lock: { mode: "pessimistic_write" },
      });
      if (oldSlot && oldSlot.status !== AppointmentSlotStatus.BLOCKED) {
        oldSlot.status = AppointmentSlotStatus.AVAILABLE;
        oldSlot.heldUntil = null;
        await slots.save(oldSlot);
      }

      if (appointment.status === AppointmentStatus.CONFIRMED) {
        newSlot.status = AppointmentSlotStatus.BOOKED;
        newSlot.heldUntil = null;
      } else {
        newSlot.status = AppointmentSlotStatus.HELD;
        newSlot.heldUntil = oldSlot?.heldUntil ?? new Date(input.now.getTime() + 10 * 60 * 1000);
      }
      await slots.save(newSlot);

      appointment.slotId = newSlot.id;
      appointment.scheduledStartAt = newSlot.startAt;
      appointment.scheduledEndAt = newSlot.endAt;
      appointment.reminder24hSent = false;
      appointment.reminder30minSent = false;
      const saved = await appointments.save(appointment);
      saved.slot = newSlot;
      saved.familyMember = appointment.familyMember;

      return { kind: "RESCHEDULED", appointment: this.toAppointment(saved) };
    });
  }

  async listPatientAppointments(patientProfileId: string): Promise<AppointmentView[]> {
    const appointments = await this.dataSource.getRepository(Appointment).find({
      where: { patientProfileId },
      relations: { slot: { chamber: { hospital: true } }, familyMember: true },
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
        familyMember: true,
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

  async getAppointmentForVideoSession(input: {
    appointmentId: string;
    actor: {
      patientProfileId?: string | null | undefined;
      doctorProfileId?: string | null | undefined;
    };
    now: Date;
  }): Promise<AppointmentVideoEligibilityResult> {
    const appointment = await this.dataSource.getRepository(Appointment).findOne({
      where: { id: input.appointmentId },
      relations: {
        doctor: { user: true },
        patientProfile: { user: true },
      },
    });
    if (!appointment) {
      return { kind: "APPOINTMENT_NOT_FOUND" };
    }

    const isPatient =
      Boolean(input.actor.patientProfileId) &&
      input.actor.patientProfileId === appointment.patientProfileId;
    const isDoctor =
      Boolean(input.actor.doctorProfileId) &&
      input.actor.doctorProfileId === appointment.doctorProfileId;

    if (!isPatient && !isDoctor) {
      return { kind: "APPOINTMENT_FORBIDDEN" };
    }

    if (appointment.mode !== ConsultationMode.VIDEO) {
      return { kind: "VIDEO_NOT_APPLICABLE" };
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      return { kind: "VIDEO_NOT_CONFIRMED" };
    }

    const opensAt = new Date(appointment.scheduledStartAt.getTime() - 5 * 60 * 1000);
    const closesAt = new Date(appointment.scheduledEndAt.getTime());

    if (input.now < opensAt || input.now > closesAt) {
      return {
        kind: "VIDEO_WINDOW_CLOSED",
        opensAt,
        closesAt,
        scheduledStartAt: appointment.scheduledStartAt,
        scheduledEndAt: appointment.scheduledEndAt,
      };
    }

    const doctorName = appointment.doctor?.user
      ? `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`.trim()
      : "Doctor";
    const patientName = appointment.patientProfile?.user
      ? `${appointment.patientProfile.user.firstName} ${appointment.patientProfile.user.lastName}`.trim()
      : "Patient";
    const participantRole = isDoctor ? "DOCTOR" : "PATIENT";
    const participantName = isDoctor ? doctorName : patientName;

    return {
      kind: "OK",
      details: {
        appointmentId: appointment.id,
        doctorProfileId: appointment.doctorProfileId,
        patientProfileId: appointment.patientProfileId,
        doctorName,
        patientName,
        participantRole,
        participantName,
        participantIdentity: isDoctor ? appointment.doctorProfileId : appointment.patientProfileId,
        scheduledStartAt: appointment.scheduledStartAt,
        scheduledEndAt: appointment.scheduledEndAt,
        opensAt,
        closesAt,
      },
    };
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

  private async hasOverlappingBookingOrHold(
    manager: EntityManager,
    patientProfileId: string,
    startAt: Date,
    endAt: Date,
    now: Date,
    excludeSlotId?: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const apptQuery = manager
      .getRepository(Appointment)
      .createQueryBuilder("appointment")
      .where("appointment.patientProfileId = :patientProfileId", { patientProfileId })
      .andWhere("appointment.status IN (:...statuses)", {
        statuses: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_PAYMENT],
      })
      .andWhere("appointment.scheduledStartAt < :endAt AND appointment.scheduledEndAt > :startAt", {
        startAt,
        endAt,
      });
    if (excludeAppointmentId) {
      apptQuery.andWhere("appointment.id != :excludeAppointmentId", { excludeAppointmentId });
    }
    const overlappingAppointments = await apptQuery.getCount();
    if (overlappingAppointments > 0) return true;

    const holdQuery = manager
      .getRepository(SlotHold)
      .createQueryBuilder("hold")
      .innerJoin("hold.slot", "heldSlot")
      .where("hold.patientProfileId = :patientProfileId", { patientProfileId })
      .andWhere("hold.status = :active", { active: SlotHoldStatus.ACTIVE })
      .andWhere("hold.expiresAt > :now", { now })
      .andWhere("heldSlot.startAt < :endAt AND heldSlot.endAt > :startAt", { startAt, endAt });
    if (excludeSlotId) {
      holdQuery.andWhere("hold.slotId != :excludeSlotId", { excludeSlotId });
    }
    const overlappingHolds = await holdQuery.getCount();
    return overlappingHolds > 0;
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
      familyMemberId: appointment.familyMemberId ?? null,
      familyMember: appointment.familyMember
        ? {
            id: appointment.familyMember.id,
            name: appointment.familyMember.name,
            relationship: appointment.familyMember.relationship,
          }
        : null,
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
