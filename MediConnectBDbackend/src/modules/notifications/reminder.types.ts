/**
 * Types for the reminder scheduling system.
 */

export interface ReminderJobPayload {
  version: 1;
  appointmentId: string;
  patientEmail: string;
  doctorName: string;
  scheduledAt: string; // ISO date string
  hoursBefore: number; // 24 or 30 minutes expressed as fraction (e.g., 0.5 for 30min)
}

export interface ReminderSchedulerQueue {
  upsertJobScheduler(
    schedulerId: string,
    repeat: { every: number },
    template: {
      name: string;
      data: { version: 1 };
      opts: {
        attempts: number;
        backoff: { type: "exponential"; delay: number };
        removeOnComplete: number;
        removeOnFail: number;
      };
    },
  ): Promise<unknown>;
}

export interface ReminderJobProcessor {
  processReminders(batchSize: number): Promise<number>;
}
