import type {
  GeneratedSlot,
  ScheduleRuleView,
  TimeOffView,
} from "./scheduling.types";
import { ConsultationMode } from "../../database/entities/consultation-mode";

const DHAKA_OFFSET_MILLISECONDS = 6 * 60 * 60 * 1000;

export interface SlotGenerationInput {
  doctorProfileId: string;
  rules: ScheduleRuleView[];
  timeOff: TimeOffView[];
  videoConsultationFee: number | null;
  chambers: Array<{ id: string; consultationFee: number; isActive: boolean }>;
  startDate: string;
  days: number;
  now: Date;
}

export function todayInDhaka(now: Date): string {
  return new Date(now.getTime() + DHAKA_OFFSET_MILLISECONDS).toISOString().slice(0, 10);
}

export function addCalendarDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dhakaDateTimeToUtc(date: string, time: string): Date {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalizedTime}+06:00`);
}

export function dhakaDateRange(startDate: string, days: number): { start: Date; end: Date } {
  return {
    start: dhakaDateTimeToUtc(startDate, "00:00:00"),
    end: dhakaDateTimeToUtc(addCalendarDays(startDate, days), "00:00:00"),
  };
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function isBlocked(
  date: string,
  startAt: Date,
  endAt: Date,
  timeOff: TimeOffView[],
): boolean {
  return timeOff.some((item) => {
    if (item.date !== date) return false;
    if (item.startTime === null || item.endTime === null) return true;
    const blockedStart = dhakaDateTimeToUtc(date, item.startTime);
    const blockedEnd = dhakaDateTimeToUtc(date, item.endTime);
    return startAt < blockedEnd && endAt > blockedStart;
  });
}

export function generateSlots(input: SlotGenerationInput): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  const chamberFees = new Map(
    input.chambers
      .filter((chamber) => chamber.isActive)
      .map((chamber) => [chamber.id, chamber.consultationFee]),
  );

  for (let dayIndex = 0; dayIndex < input.days; dayIndex += 1) {
    const date = addCalendarDays(input.startDate, dayIndex);
    const rules = input.rules.filter(
      (rule) => rule.isActive && rule.dayOfWeek === dayOfWeek(date),
    );

    for (const rule of rules) {
      const fee =
        rule.mode === ConsultationMode.VIDEO
          ? input.videoConsultationFee
          : rule.chamberId
            ? chamberFees.get(rule.chamberId) ?? null
            : null;
      if (fee === null) continue;

      let cursor = dhakaDateTimeToUtc(date, rule.startTime);
      const ruleEnd = dhakaDateTimeToUtc(date, rule.endTime);
      const durationMilliseconds = rule.slotDurationMinutes * 60 * 1000;

      while (cursor.getTime() + durationMilliseconds <= ruleEnd.getTime()) {
        const endAt = new Date(cursor.getTime() + durationMilliseconds);
        if (cursor > input.now && !isBlocked(date, cursor, endAt, input.timeOff)) {
          slots.push({
            doctorProfileId: input.doctorProfileId,
            scheduleId: rule.id,
            chamberId: rule.chamberId ?? null,
            startAt: cursor,
            endAt,
            mode: rule.mode,
            feeAmount: fee,
          });
        }
        cursor = endAt;
      }
    }
  }

  return slots.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}
