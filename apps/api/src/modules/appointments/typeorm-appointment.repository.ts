import type { DataSource, EntityManager } from "typeorm";
import {
  Appointment,
  AppointmentStatus,
} from "../../database/entities/appointment.entity";
import {
  AppointmentSlot,
  AppointmentSlotStatus,
} from "../../database/entities/appointment-slot.entity";
import { ConsultationMode } from "../../database/entities/consultation-mode";
import { SlotHold, SlotHoldStatus } from "../../database/entities/slot-hold.entity";
import type { AppointmentRepository } from "./appointment.repository";
import type {
  AppointmentView,
  BookingSlotView,
  BookHoldResult,
  CreateHoldResult,
  ReleaseHoldResult,
  SlotHoldView,
} from "./appointment.types";

export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

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

  async bookHold(input: {
    holdId: string;
    patientProfileId: string;
    now: Date;
  }): Promise<BookHoldResult> {
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
  }

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

  async listPatientAppointments(patientProfileId: string): Promise<AppointmentView[]> {
    const appointments = await this.dataSource.getRepository(Appointment).find({
      where: { patientProfileId },
      relations: { slot: { chamber: { hospital: true } } },
      order: { scheduledStartAt: "ASC", id: "ASC" },
    });
    return appointments.map((appointment) => this.toAppointment(appointment));
  }

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
