/**
 * Coordinates approved-doctor availability, Dhaka calendar boundaries, overlap/ownership
 * validation, and rolling seven-day regeneration. Public availability also regenerates slots until
 * a periodic worker takes over that responsibility.
 */

import { AppError } from "../../utils/app-error";
import { DoctorApplicationStatus } from "../doctors/doctor-profile.entity";
import { ConsultationMode } from "../appointments/consultation-mode";
import type { DoctorRepository } from "../doctors/doctor.repository";
import type { DoctorProfileDetails, PublicDoctorProfile } from "../doctors/doctor.types";
import type { SchedulingRepository } from "./scheduling.repository";
import {
  addCalendarDays,
  dhakaDateRange,
  generateSlots,
  todayInDhaka,
} from "./slot-generator";
import type {
  AvailabilityQuery,
  AvailabilityResult,
  ScheduleRuleInput,
  SchedulingOverview,
  TimeOffInput,
  TimeOffView,
} from "./scheduling.types";

const MAX_TIME_OFF_DAYS_AHEAD = 365;
const MINIMUM_BOOKING_LEAD_MILLISECONDS = 60 * 60 * 1000;

type SchedulableProfile = Pick<
  DoctorProfileDetails | PublicDoctorProfile,
  "id" | "videoConsultationFee" | "chambers"
>;

export class SchedulingService {
  constructor(
    private readonly repository: SchedulingRepository,
    private readonly doctors: DoctorRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getMySchedule(userId: string): Promise<SchedulingOverview> {
    const profile = await this.requireApprovedDoctor(userId);
    const today = todayInDhaka(this.now());
    const [rules, timeOff] = await Promise.all([
      this.repository.listRules(profile.id),
      this.repository.listTimeOff(
        profile.id,
        today,
        addCalendarDays(today, MAX_TIME_OFF_DAYS_AHEAD),
      ),
    ]);
    return { timezone: "Asia/Dhaka", rules, timeOff };
  }

  /**
   * Validates all weekly rules, replaces them, then regenerates the rolling window. Rule
   * replacement and regeneration are separate repository operations.
   */
  async replaceMySchedule(
    userId: string,
    rules: ScheduleRuleInput[],
  ): Promise<SchedulingOverview> {
    const profile = await this.requireApprovedDoctor(userId);
    this.validateRules(rules, profile);
    await this.repository.replaceRules(profile.id, rules);
    await this.regenerate(profile);
    return this.getMySchedule(userId);
  }

  /**
   * Restricts local time-off dates to today through one year ahead, then refreshes generated
   * availability.
   */
  async addMyTimeOff(userId: string, input: TimeOffInput): Promise<TimeOffView> {
    const profile = await this.requireApprovedDoctor(userId);
    const today = todayInDhaka(this.now());
    if (input.date < today || input.date > addCalendarDays(today, MAX_TIME_OFF_DAYS_AHEAD)) {
      throw new AppError(
        422,
        "TIME_OFF_DATE_OUT_OF_RANGE",
        "Time off must be between today and one year from today",
      );
    }
    const saved = await this.repository.addTimeOff(profile.id, input);
    await this.regenerate(profile);
    return saved;
  }

  async removeMyTimeOff(userId: string, timeOffId: string): Promise<void> {
    const profile = await this.requireApprovedDoctor(userId);
    if (!(await this.repository.removeTimeOff(profile.id, timeOffId))) {
      throw new AppError(404, "TIME_OFF_NOT_FOUND", "Time-off entry was not found");
    }
    await this.regenerate(profile);
  }

  async regenerateMySlots(userId: string): Promise<{ generated: number }> {
    const profile = await this.requireApprovedDoctor(userId);
    return { generated: await this.regenerate(profile) };
  }

  /**
   * Restricts results to the rolling seven-day Dhaka window and applies the one-hour booking lead
   * time.
   */
  async getPublicAvailability(
    doctorId: string,
    query: AvailabilityQuery,
  ): Promise<AvailabilityResult> {
    const profile = await this.doctors.findPublicById(doctorId);
    if (!profile) {
      throw new AppError(404, "DOCTOR_NOT_FOUND", "Approved doctor was not found");
    }

    const now = this.now();
    const today = todayInDhaka(now);
    const from = query.from ?? today;
    const through = addCalendarDays(from, query.days - 1);
    if (from < today || through > addCalendarDays(today, 6)) {
      throw new AppError(
        422,
        "AVAILABILITY_RANGE_OUT_OF_BOUNDS",
        "Availability can only be requested within the next seven days",
      );
    }

    await this.regenerate(profile);
    const range = dhakaDateRange(from, query.days);
    const leadTime = new Date(now.getTime() + MINIMUM_BOOKING_LEAD_MILLISECONDS);
    const rangeStart = leadTime > range.start ? leadTime : range.start;
    const items = await this.repository.listAvailableSlots(
      profile.id,
      rangeStart,
      range.end,
      now,
    );
    return {
      doctorId: profile.id,
      timezone: "Asia/Dhaka",
      from,
      through,
      items,
    };
  }

  private async requireApprovedDoctor(userId: string): Promise<DoctorProfileDetails> {
    const profile = await this.doctors.findByUserId(userId);
    if (!profile) {
      throw new AppError(404, "DOCTOR_PROFILE_NOT_FOUND", "Doctor profile was not found");
    }
    if (profile.applicationStatus !== DoctorApplicationStatus.APPROVED) {
      throw new AppError(
        403,
        "DOCTOR_NOT_APPROVED",
        "Only an approved doctor can manage availability",
      );
    }
    return profile;
  }

  /**
   * Rejects another doctor's/inactive chambers and overlaps across both video and chamber modes.
   */
  private validateRules(rules: ScheduleRuleInput[], profile: DoctorProfileDetails): void {
    const activeChambers = new Set(
      profile.chambers.filter((chamber) => chamber.isActive).map((chamber) => chamber.id),
    );
    for (const rule of rules) {
      if (rule.mode === ConsultationMode.VIDEO && profile.videoConsultationFee === null) {
        throw new AppError(
          422,
          "VIDEO_FEE_REQUIRED",
          "Set a video consultation fee before adding video availability",
        );
      }
      if (
        rule.mode === ConsultationMode.CHAMBER &&
        (!rule.chamberId || !activeChambers.has(rule.chamberId))
      ) {
        throw new AppError(
          422,
          "INVALID_SCHEDULE_CHAMBER",
          "A chamber schedule must use one of the doctor's active chambers",
        );
      }
    }

    for (let day = 0; day <= 6; day += 1) {
      const dailyRules = rules
        .filter((rule) => rule.dayOfWeek === day)
        .sort((left, right) => left.startTime.localeCompare(right.startTime));
      for (let index = 1; index < dailyRules.length; index += 1) {
        const previous = dailyRules[index - 1];
        const current = dailyRules[index];
        if (previous && current && current.startTime < previous.endTime) {
          throw new AppError(
            422,
            "SCHEDULE_OVERLAP",
            "A doctor cannot have overlapping video or chamber schedules",
          );
        }
      }
    }
  }

  /**
   * Expands local rules into concrete UTC slots and synchronizes only replaceable availability
   * rows.
   */
  private async regenerate(profile: SchedulableProfile): Promise<number> {
    const now = this.now();
    const startDate = todayInDhaka(now);
    const through = addCalendarDays(startDate, 6);
    const [rules, timeOff] = await Promise.all([
      this.repository.listRules(profile.id),
      this.repository.listTimeOff(profile.id, startDate, through),
    ]);
    const slots = generateSlots({
      doctorProfileId: profile.id,
      rules,
      timeOff,
      videoConsultationFee: profile.videoConsultationFee,
      chambers: profile.chambers,
      startDate,
      days: 7,
      now,
    });
    const range = dhakaDateRange(startDate, 7);
    await this.repository.syncAvailableSlots(profile.id, range.start, range.end, slots);
    return slots.length;
  }
}
