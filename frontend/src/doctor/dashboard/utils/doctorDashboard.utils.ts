import type { ScheduleRule } from "../types/doctorDashboard.types";

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function applicationStatusTone(status: string): string {
  if (status === "APPROVED") return "success";
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export function parseCommaSeparatedLanguages(input: string): string[] {
  const parsed = input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : ["Bangla"];
}

export function mapRuleToPayload(rule: ScheduleRule) {
  return {
    dayOfWeek: rule.dayOfWeek,
    startTime: rule.startTime.slice(0, 5),
    endTime: rule.endTime.slice(0, 5),
    slotDurationMinutes: rule.slotDurationMinutes,
    mode: rule.mode,
    ...(rule.chamberId ? { chamberId: rule.chamberId } : {}),
  };
}
