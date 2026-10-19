/**
 * Makes the local-calendar/UTC distinction explicit in scheduling inputs and outputs. Rule times
 * and time-off dates are local strings; concrete slot start/end values are Date instants.
 */

import type { ConsultationMode } from "../appointments/consultation-mode";

export interface ScheduleRuleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: 10 | 15 | 20 | 30;
  mode: ConsultationMode;
  chamberId?: string | null | undefined;
}

export interface ScheduleRuleView extends ScheduleRuleInput {
  id: string;
  doctorProfileId: string;
  isActive: boolean;
}

export interface TimeOffInput {
  date: string;
  startTime?: string | null | undefined;
  endTime?: string | null | undefined;
  reason?: string | null | undefined;
}

export interface TimeOffView {
  id: string;
  doctorProfileId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface GeneratedSlot {
  doctorProfileId: string;
  scheduleId: string;
  chamberId: string | null;
  startAt: Date;
  endAt: Date;
  mode: ConsultationMode;
  feeAmount: number;
}

export interface AvailableSlotView {
  id: string;
  doctorId: string;
  startAt: Date;
  endAt: Date;
  mode: ConsultationMode;
  feeAmount: number;
  chamber: {
    id: string;
    roomOrUnit: string | null;
    hospital: {
      id: string;
      name: string;
      slug: string;
      area: string;
      address: string;
    };
  } | null;
}

export interface AvailabilityQuery {
  from?: string | undefined;
  days: number;
}

export interface AvailabilityResult {
  doctorId: string;
  timezone: "Asia/Dhaka";
  from: string;
  through: string;
  items: AvailableSlotView[];
}

export interface SchedulingOverview {
  timezone: "Asia/Dhaka";
  rules: ScheduleRuleView[];
  timeOff: TimeOffView[];
}
