/**
 * Stores recurring rules/time off and synchronizes generated availability. Synchronization selects
 * only AVAILABLE rows so it does not rewrite active holds or confirmed bookings; booking remains
 * responsible for reclaiming expired holds.
 */

import { In, type DataSource } from "typeorm";
import {
  AppointmentSlot,
  AppointmentSlotStatus,
} from "./appointment-slot.entity";
import { DoctorSchedule } from "./doctor-schedule.entity";
import { ScheduleTimeOff } from "./schedule-time-off.entity";
import type { SchedulingRepository } from "./scheduling.repository";
import type {
  AvailableSlotView,
  GeneratedSlot,
  ScheduleRuleInput,
  ScheduleRuleView,
  TimeOffInput,
  TimeOffView,
} from "./scheduling.types";

export class TypeOrmSchedulingRepository implements SchedulingRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listRules(doctorId: string): Promise<ScheduleRuleView[]> {
    const rules = await this.dataSource.getRepository(DoctorSchedule).find({
      where: { doctorProfileId: doctorId },
      order: { dayOfWeek: "ASC", startTime: "ASC", id: "ASC" },
    });
    return rules.map((rule) => this.toRule(rule));
  }

  /**
   * Replaces a doctor's weekly rule collection atomically; the service performs overlap/approval
   * validation first.
   */
  async replaceRules(
    doctorId: string,
    rules: ScheduleRuleInput[],
  ): Promise<ScheduleRuleView[]> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DoctorSchedule);
      await repository.delete({ doctorProfileId: doctorId });
      if (rules.length > 0) {
        await repository.save(
          rules.map((rule) =>
            repository.create({
              doctorProfileId: doctorId,
              dayOfWeek: rule.dayOfWeek,
              startTime: rule.startTime,
              endTime: rule.endTime,
              slotDurationMinutes: rule.slotDurationMinutes,
              mode: rule.mode,
              chamberId: rule.chamberId ?? null,
              isActive: true,
            }),
          ),
        );
      }
    });
    return this.listRules(doctorId);
  }

  async listTimeOff(
    doctorId: string,
    from: string,
    through: string,
  ): Promise<TimeOffView[]> {
    const items = await this.dataSource
      .getRepository(ScheduleTimeOff)
      .createQueryBuilder("timeOff")
      .where("timeOff.doctor_profile_id = :doctorId", { doctorId })
      .andWhere("timeOff.date >= :from AND timeOff.date <= :through", { from, through })
      .orderBy("timeOff.date", "ASC")
      .addOrderBy("timeOff.start_time", "ASC")
      .addOrderBy("timeOff.id", "ASC")
      .getMany();
    return items.map((item) => this.toTimeOff(item));
  }

  async addTimeOff(doctorId: string, input: TimeOffInput): Promise<TimeOffView> {
    const repository = this.dataSource.getRepository(ScheduleTimeOff);
    const saved = await repository.save(
      repository.create({
        doctorProfileId: doctorId,
        date: input.date,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        reason: input.reason ?? null,
      }),
    );
    return this.toTimeOff(saved);
  }

  async removeTimeOff(doctorId: string, timeOffId: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(ScheduleTimeOff).delete({
      id: timeOffId,
      doctorProfileId: doctorId,
    });
    return result.affected === 1;
  }

  /**
   * Locks AVAILABLE rows and updates their generated snapshots. Held/booked rows are excluded;
   * duplicate inserts are ignored by the doctor/start unique key.
   */
  async syncAvailableSlots(
    doctorId: string,
    rangeStart: Date,
    rangeEnd: Date,
    slots: GeneratedSlot[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AppointmentSlot);
      const existing = await repository
        .createQueryBuilder("slot")
        .setLock("pessimistic_write")
        .where("slot.doctor_profile_id = :doctorId", { doctorId })
        .andWhere("slot.status = :status", { status: AppointmentSlotStatus.AVAILABLE })
        .andWhere("slot.start_at >= :rangeStart AND slot.start_at < :rangeEnd", {
          rangeStart,
          rangeEnd,
        })
        .getMany();

      const desiredByStart = new Map(
        slots.map((slot) => [slot.startAt.getTime(), slot]),
      );
      // Only the AVAILABLE rows selected above participate in deletion/update.
      const staleIds = existing
        .filter((slot) => !desiredByStart.has(slot.startAt.getTime()))
        .map((slot) => slot.id);
      if (staleIds.length > 0) await repository.delete({ id: In(staleIds) });

      const existingByStart = new Map(
        existing.map((slot) => [slot.startAt.getTime(), slot]),
      );
      const updates: AppointmentSlot[] = [];
      const inserts: GeneratedSlot[] = [];
      for (const desired of slots) {
        const current = existingByStart.get(desired.startAt.getTime());
        if (!current) {
          inserts.push(desired);
          continue;
        }
        current.scheduleId = desired.scheduleId;
        current.chamberId = desired.chamberId;
        current.endAt = desired.endAt;
        current.mode = desired.mode;
        current.feeAmount = desired.feeAmount.toFixed(2);
        current.heldUntil = null;
        updates.push(current);
      }
      if (updates.length > 0) await repository.save(updates);

      if (inserts.length > 0) {
        await repository
          .createQueryBuilder()
          .insert()
          .values(
            inserts.map((slot) => ({
              doctorProfileId: doctorId,
              scheduleId: slot.scheduleId,
              chamberId: slot.chamberId,
              startAt: slot.startAt,
              endAt: slot.endAt,
              mode: slot.mode,
              feeAmount: slot.feeAmount.toFixed(2),
              status: AppointmentSlotStatus.AVAILABLE,
              heldUntil: null,
            })),
          )
          .orIgnore()
          .execute();
      }
    });
  }

  /**
   * Includes expired HELD rows as reclaimable availability; the subsequent hold transaction
   * rechecks and expires them before granting ownership.
   */
  async listAvailableSlots(
    doctorId: string,
    rangeStart: Date,
    rangeEnd: Date,
    now: Date,
  ): Promise<AvailableSlotView[]> {
    const slots = await this.dataSource
      .getRepository(AppointmentSlot)
      .createQueryBuilder("slot")
      .leftJoinAndSelect("slot.chamber", "chamber")
      .leftJoinAndSelect("chamber.hospital", "hospital")
      .where("slot.doctor_profile_id = :doctorId", { doctorId })
      .andWhere(
        "(slot.status = :available OR (slot.status = :held AND slot.held_until <= :now))",
        {
          available: AppointmentSlotStatus.AVAILABLE,
          held: AppointmentSlotStatus.HELD,
          now,
        },
      )
      .andWhere("slot.start_at >= :rangeStart AND slot.start_at < :rangeEnd", {
        rangeStart,
        rangeEnd,
      })
      .orderBy("slot.start_at", "ASC")
      .getMany();

    return slots.map((slot) => ({
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
                slug: slot.chamber.hospital.slug,
                area: slot.chamber.hospital.area,
                address: slot.chamber.hospital.address,
              },
            }
          : null,
    }));
  }

  private toRule(rule: DoctorSchedule): ScheduleRuleView {
    return {
      id: rule.id,
      doctorProfileId: rule.doctorProfileId,
      dayOfWeek: rule.dayOfWeek,
      startTime: rule.startTime,
      endTime: rule.endTime,
      slotDurationMinutes: rule.slotDurationMinutes as 10 | 15 | 20 | 30,
      mode: rule.mode,
      chamberId: rule.chamberId,
      isActive: rule.isActive,
    };
  }

  private toTimeOff(item: ScheduleTimeOff): TimeOffView {
    return {
      id: item.id,
      doctorProfileId: item.doctorProfileId,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      reason: item.reason,
      createdAt: item.createdAt,
    };
  }
}
