/**
 * Separate BullMQ worker process for sending appointment reminders.
 * Registers recurring reminder jobs, queries upcoming appointments,
 * and sends emails via the notification service.
 */

import "reflect-metadata";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import pino from "pino";
import { env } from "../config/env";
import AppDataSource from "../database/data-source";
import { DefaultEmailService } from "../modules/notifications/email-service";
import { ConsoleTransport } from "../modules/notifications/console-transport";
import { TypeOrmReminderRepository } from "../modules/notifications/typeorm-reminder.repository";
import {
  REMINDERS_QUEUE,
  REMINDER_24H_JOB,
  REMINDER_30MIN_JOB,
  createReminderProcessor,
  registerReminderSchedules,
} from "../modules/notifications/reminder-scheduler";

const logger = pino({ level: env.LOG_LEVEL ?? "info" });
let connection: Redis | null = null;
let queue: Queue | null = null;
let worker: Worker | null = null;
let stopping = false;

async function closeResources(): Promise<void> {
  await worker?.close();
  await queue?.close();
  if (connection && connection.status !== "end") await connection.quit();
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, "Shutting down reminder worker");
  await closeResources();
}

async function main(): Promise<void> {
  await AppDataSource.initialize();

  const emailService = new DefaultEmailService(new ConsoleTransport());
  const reminderRepo = new TypeOrmReminderRepository(AppDataSource);

  const redisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  connection = redisConnection;
  queue = new Queue(REMINDERS_QUEUE, { connection });

  // Create processors for both reminder types
  const processor24h = createReminderProcessor(emailService, reminderRepo);
  const processor30min = createReminderProcessor(emailService, reminderRepo);

  worker = new Worker(
    REMINDERS_QUEUE,
    async (job) => {
      if (job.name === REMINDER_24H_JOB) {
        return processor24h(job, 24);
      }
      if (job.name === REMINDER_30MIN_JOB) {
        return processor30min(job, 0.5);
      }
      throw new Error(`Unsupported job type: ${job.name}`);
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", (job, result) =>
    logger.info({ jobId: job.id, jobName: job.name, result }, "Reminder job completed"),
  );
  worker.on("failed", (job, error) =>
    logger.error({ jobId: job?.id, jobName: job?.name, error }, "Reminder job failed"),
  );
  worker.on("error", (error) => logger.error({ error }, "Worker error"));

  await Promise.all([worker.waitUntilReady(), queue.waitUntilReady()]);
  await registerReminderSchedules(queue);
  logger.info("Reminder worker is ready");

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal)
        .then(() => process.exit(0))
        .catch((error) => {
          logger.error({ error }, "Worker shutdown failed");
          process.exit(1);
        });
    });
  }
}

void main().catch(async (error) => {
  logger.error({ error }, "Reminder worker startup failed");
  await closeResources().catch((cleanupError) => {
    logger.error({ error: cleanupError }, "Worker startup cleanup failed");
  });
  process.exitCode = 1;
});
