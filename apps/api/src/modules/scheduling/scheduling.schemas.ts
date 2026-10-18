import { z } from "zod";
import { ConsultationMode } from "../../database/entities/consultation-mode";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use 24-hour HH:mm format")
  .transform((value) => `${value}:00`);

const baseRule = {
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  slotDurationMinutes: z.union([
    z.literal(10),
    z.literal(15),
    z.literal(20),
    z.literal(30),
  ]),
};

const ruleSchema = z
  .discriminatedUnion("mode", [
    z.object({
      ...baseRule,
      mode: z.literal(ConsultationMode.VIDEO),
      chamberId: z.null().optional(),
    }),
    z.object({
      ...baseRule,
      mode: z.literal(ConsultationMode.CHAMBER),
      chamberId: z.string().uuid(),
    }),
  ])
  .refine((rule) => rule.startTime < rule.endTime, {
    message: "startTime must be earlier than endTime",
    path: ["startTime"],
  });

export const replaceScheduleSchema = z.object({
  rules: z.array(ruleSchema).max(50),
});

function validDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine(validDate, "Date is invalid");

export const createTimeOffSchema = z
  .object({
    date: calendarDate,
    startTime: z.union([time, z.null()]).optional(),
    endTime: z.union([time, z.null()]).optional(),
    reason: z.union([z.string().trim().min(1).max(300), z.null()]).optional(),
  })
  .superRefine((input, context) => {
    const hasStart = typeof input.startTime === "string";
    const hasEnd = typeof input.endTime === "string";
    if (hasStart !== hasEnd) {
      context.addIssue({
        code: "custom",
        message: "Provide both startTime and endTime, or neither for a full day",
        path: ["startTime"],
      });
    } else if (hasStart && hasEnd && input.startTime! >= input.endTime!) {
      context.addIssue({
        code: "custom",
        message: "startTime must be earlier than endTime",
        path: ["startTime"],
      });
    }
  });

export const availabilityQuerySchema = z.object({
  from: z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : value),
    calendarDate.optional(),
  ),
  days: z.preprocess(
    (value) => (value === undefined ? 7 : value),
    z.coerce.number().int().min(1).max(7),
  ),
});

export const timeOffIdSchema = z.string().uuid();
