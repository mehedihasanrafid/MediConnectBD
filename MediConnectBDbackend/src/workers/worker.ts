/**
 * Separate BullMQ worker process. It registers bounded recurring maintenance work, uses MySQL as
 * the source of truth, and shuts down the worker, scheduler connection, Redis, and TypeORM cleanly.
 */

import "reflect-metadata";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import pino from "pino";
import { env } from "../config/env";
import AppDataSource from "../database/data-source";
import { PaymentService } from "../modules/payments/payment.service";
import { TypeOrmPaymentRepository } from "../modules/payments/typeorm-payment.repository";
import {
  SYSTEM_JOBS_QUEUE,
  createSystemJobProcessor,
  registerSystemJobSchedules,
} from "./system-jobs";

const logger = pino({ level: env.LOG_LEVEL });
let connection: Redis | null = null;
let queue: Queue | null = null;
let worker: Worker | null = null;
let stopping = false;

async function closeResources(): Promise<void> {
  await worker?.close();
  await queue?.close();
  if (connection?.status !== "end") await connection?.quit();
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, "Shutting down worker");
  await closeResources();
}

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const paymentService = new PaymentService(
    new TypeOrmPaymentRepository(AppDataSource),
    null,
  );

  connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  queue = new Queue(SYSTEM_JOBS_QUEUE, { connection });
  worker = new Worker(
    SYSTEM_JOBS_QUEUE,
    createSystemJobProcessor(paymentService),
    { connection, concurrency: 1 },
  );

  worker.on("completed", (job, result: unknown) =>
    logger.info({ jobId: job.id, jobName: job.name, result }, "Job completed"),
  );
  worker.on("failed", (job, error) =>
    logger.error({ jobId: job?.id, jobName: job?.name, error }, "Job failed"),
  );
  worker.on("error", (error) => logger.error({ error }, "Worker error"));

  await Promise.all([worker.waitUntilReady(), queue.waitUntilReady()]);
  await registerSystemJobSchedules(queue);
  logger.info("Background worker is ready");

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal)
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          logger.error({ error }, "Worker shutdown failed");
          process.exit(1);
        });
    });
  }
}

void main().catch(async (error: unknown) => {
  logger.error({ error }, "Worker startup failed");
  await closeResources().catch((cleanupError: unknown) => {
    logger.error({ error: cleanupError }, "Worker startup cleanup failed");
  });
  process.exitCode = 1;
});
