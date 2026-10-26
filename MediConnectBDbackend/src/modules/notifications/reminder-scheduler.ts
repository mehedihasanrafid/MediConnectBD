/**
 * Reminder scheduling system — registers recurring jobs and processes them.
 * Uses the same BullMQ pattern as the existing hold expiry worker.
 */

import type { Job } from "bullmq";
import { z } from "zod";
import type { EmailService } from "./email.types";
import type {
  ReminderJobPayload,
  ReminderSchedulerQueue,
  ReminderJobProcessor,
} from "./reminder.types";
import type { UpcomingAppointmentInfo } from "./typeorm-reminder.repository";

export const REMINDERS_QUEUE = "reminders";
export const REMINDER_24H_JOB = "reminder-24h-v1";
export const REMINDER_30MIN_JOB = "reminder-30min-v1";
export const REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
export const REMINDER_BATCH_SIZE = 100;

const reminderPayloadSchema = z.object({
  version: z.literal(1),
}).strict();

export interface UpcomingAppointmentRepository {
  findUpcomingReminders(
    now: Date,
    hoursBefore: number,
    batchSize: number,
  ): Promise<UpcomingAppointmentInfo[]>;
  markReminderSent(appointmentId: string, hoursBefore: number): Promise<void>;
}

/**
 * Upserts recurring reminder jobs. The 24h job runs every 5 minutes to catch appointments
 * exactly 24 hours before their scheduled time. The 30min job does the same for 30 minutes.
 */
export async function registerReminderSchedules(
  queue: ReminderSchedulerQueue,
): Promise<void> {
  await queue.upsertJobScheduler(
    REMINDER_24H_JOB,
    { every: REMINDER_CHECK_INTERVAL_MS },
    {
      name: REMINDER_24H_JOB,
      data: { version: 1 },
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    },
  );

  await queue.upsertJobScheduler(
    REMINDER_30MIN_JOB,
    { every: REMINDER_CHECK_INTERVAL_MS },
    {
      name: REMINDER_30MIN_JOB,
      data: { version: 1 },
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    },
  );
}

/**
 * Creates a processor that queries upcoming appointments and sends reminder emails.
 * Idempotent: only sends if the appointment is CONFIRMED and within the reminder window.
 */
export function createReminderProcessor(
  emailService: EmailService,
  repo: UpcomingAppointmentRepository,
) {
  return async (job: Job<unknown>, hoursBefore: number): Promise<number> => {
    const payload = reminderPayloadSchema.parse(job.data);
    if (payload.version !== 1) {
      throw new Error(`Unsupported reminder version: ${payload.version}`);
    }

    const count = await processReminders(emailService, repo, hoursBefore, REMINDER_BATCH_SIZE);
    return count;
  };
}

/**
 * Queries upcoming appointments and sends reminders for those within the specified window.
 * Returns the number of reminders sent.
 */
export async function processReminders(
  emailService: EmailService,
  repo: UpcomingAppointmentRepository,
  hoursBefore: number,
  batchSize: number,
): Promise<number> {
  const now = new Date();
  const appointments = await repo.findUpcomingReminders(now, hoursBefore, batchSize);

  let sent = 0;
  for (const appt of appointments) {
    try {
      await emailService.sendReminder(
        appt.patientEmail,
        appt.id,
        appt.doctorName,
        new Date(appt.scheduledAt),
      );
      await repo.markReminderSent(appt.id, hoursBefore);
      sent++;
    } catch (error) {
      console.error({ error, apptId: appt.id }, "Failed to send reminder");
    }
  }

  return sent;
}
