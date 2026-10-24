/**
 * Stable BullMQ names, payload validation, scheduling, and processing for backend maintenance
 * work. Keeping this separate from the process entry point makes job behavior testable without
 * connecting to Redis or MySQL.
 */

import type { Job } from "bullmq";
import { z } from "zod";
import type { PaymentService } from "../modules/payments/payment.service";

export const SYSTEM_JOBS_QUEUE = "system-jobs";
export const EXPIRE_UNPAID_HOLDS_JOB = "expire-unpaid-appointment-holds-v1";
export const EXPIRE_UNPAID_HOLDS_INTERVAL_MS = 30_000;
export const EXPIRE_UNPAID_HOLDS_BATCH_SIZE = 100;

const expiryPayloadSchema = z.object({ version: z.literal(1) }).strict();

type HoldExpiryService = Pick<PaymentService, "expireUnpaidHolds">;

export interface SystemJobSchedulerQueue {
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

/**
 * Upsert makes worker restarts safe: one stable scheduler ID owns the recurring cleanup.
 */
export async function registerSystemJobSchedules(
  queue: SystemJobSchedulerQueue,
): Promise<void> {
  await queue.upsertJobScheduler(
    EXPIRE_UNPAID_HOLDS_JOB,
    { every: EXPIRE_UNPAID_HOLDS_INTERVAL_MS },
    {
      name: EXPIRE_UNPAID_HOLDS_JOB,
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
 * BullMQ delivery is at least once. The repository processor is therefore idempotent and
 * rechecks current database state under row locks on every attempt.
 */
export function createSystemJobProcessor(expiryService: HoldExpiryService) {
  return async (job: Job<unknown>): Promise<unknown> => {
    if (job.name === "healthcheck") {
      return { handledAt: new Date().toISOString() };
    }
    if (job.name === EXPIRE_UNPAID_HOLDS_JOB) {
      expiryPayloadSchema.parse(job.data);
      return expiryService.expireUnpaidHolds(EXPIRE_UNPAID_HOLDS_BATCH_SIZE);
    }
    throw new Error(`Unsupported job type: ${job.name}`);
  };
}
