import type { DoctorChamberDetail } from "../../profile/types/doctorProfile.types";
import type { AddTimeOffFormValues, ScheduleRuleItem, TimeOffItem } from "../types/doctorSchedule.types";

export const scheduleDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export type SchedulePanel = { kind: "hours"; rule: ScheduleRuleItem | null } |
  { kind: "remove-hours"; rule: ScheduleRuleItem } | { kind: "remove-leave"; entry: TimeOffItem } |
  { kind: "leave" | "add-leave" | "emergency" } | null;

export function chamberForRule(rule: ScheduleRuleItem, chambers: DoctorChamberDetail[]) {
  return rule.chamber ?? chambers.find((chamber) => chamber.id === rule.chamberId || chamber.hospitalId === rule.chamberId);
}

/** Build emergency periods in Dhaka, independently of the browser's timezone. */
export function emergencyLeaveValues(preset: "today" | "two-hours" | "tomorrow", now: Date, reason: string): AddTimeOffFormValues {
  const dhaka = new Date(now.getTime() + 6 * 3600000);
  const date = dhaka.toISOString().slice(0, 10);
  const startTime = dhaka.toISOString().slice(11, 16);
  if (preset === "tomorrow") return { date: new Date(dhaka.getTime() + 86400000).toISOString().slice(0, 10), isFullDay: true, startTime: "", endTime: "", reason };
  const minutes = dhaka.getUTCHours() * 60 + dhaka.getUTCMinutes();
  const end = preset === "today" ? 1439 : Math.min(minutes + 120, 1439);
  if (end <= minutes) throw Error("No time remains today. Choose tomorrow instead.");
  return { date, isFullDay: false, startTime, endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`, reason };
}
