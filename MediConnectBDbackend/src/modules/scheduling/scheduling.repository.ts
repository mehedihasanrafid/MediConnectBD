/**
 * Storage port for weekly rules, calendar exceptions, and concrete slots. Implementations must
 * preserve held/booked rows during regeneration and treat range endpoints consistently with UTC
 * slot queries.
 */

import type {
  AvailableSlotView,
  GeneratedSlot,
  ScheduleRuleInput,
  ScheduleRuleView,
  TimeOffInput,
  TimeOffView,
} from "./scheduling.types";

export interface SchedulingRepository {
  listRules(doctorId: string): Promise<ScheduleRuleView[]>;
  replaceRules(doctorId: string, rules: ScheduleRuleInput[]): Promise<ScheduleRuleView[]>;
  listTimeOff(doctorId: string, from: string, through: string): Promise<TimeOffView[]>;
  addTimeOff(doctorId: string, input: TimeOffInput): Promise<TimeOffView>;
  removeTimeOff(doctorId: string, timeOffId: string): Promise<boolean>;
  syncAvailableSlots(
    doctorId: string,
    rangeStart: Date,
    rangeEnd: Date,
    slots: GeneratedSlot[],
  ): Promise<void>;
  listAvailableSlots(
    doctorId: string,
    rangeStart: Date,
    rangeEnd: Date,
    now: Date,
  ): Promise<AvailableSlotView[]>;
}
