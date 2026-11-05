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
import { DefaultEmailService } from "../modules/notifications/email-service";
import { ConsoleTransport } from "../modules/notifications/console-transport";
import { SmtpTransport } from "../modules/notifications/smtp-transport";
import { TypeOrmReminderRepository } from "../modules/notifications/typeorm-reminder.repository";
import {
  REMINDERS_QUEUE,
  REMINDER_24H_JOB,
  REMINDER_30MIN_JOB,
  createReminderProcessor,
  registerReminderSchedules,
} from "../modules/notifications/reminder-scheduler";
import {
  SYSTEM_JOBS_QUEUE,
  createSystemJobProcessor,
  registerSystemJobSchedules,
} from "./system-jobs";

const logger = pino({
  level: env.LOG_LEVEL,
  serializers: {
    error: env.NODE_ENV === "production" ? () => ({ message: "Background operation failed" }) : pino.stdSerializers.err,
  },
});
let connection: Redis | null = null;
let queue: Queue | null = null;
let worker: Worker | null = null;
let reminderQueue: Queue | null = null;
let reminderWorker: Worker | null = null;
let stopping = false;

async function closeResources(): Promise<void> {
  await reminderWorker?.close();
  await reminderQueue?.close();
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

  const emailTransport = env.SMTP_HOST
    ? new SmtpTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        fromAddress: env.SMTP_FROM,
      })
    : new ConsoleTransport();
  const emailService = new DefaultEmailService(emailTransport);
  const reminderRepo = new TypeOrmReminderRepository(AppDataSource);
  const reminderProcessor = createReminderProcessor(emailService, reminderRepo);
  reminderQueue = new Queue(REMINDERS_QUEUE, { connection });
  reminderWorker = new Worker(
    REMINDERS_QUEUE,
    async (job) => {
      if (job.name === REMINDER_24H_JOB) return reminderProcessor(job, 24);
      if (job.name === REMINDER_30MIN_JOB) return reminderProcessor(job, 0.5);
      throw new Error(`Unsupported reminder job type: ${job.name}`);
    },
    { connection, concurrency: 1 },
  );
  reminderWorker.on("completed", (job, result: unknown) =>
    logger.info({ jobId: job.id, jobName: job.name, result }, "Reminder job completed"),
  );
  reminderWorker.on("failed", (job, error) =>
    logger.error({ jobId: job?.id, jobName: job?.name, error }, "Reminder job failed"),
  );
  reminderWorker.on("error", (error) => logger.error({ error }, "Reminder worker error"));
  await Promise.all([reminderWorker.waitUntilReady(), reminderQueue.waitUntilReady()]);
  await registerReminderSchedules(reminderQueue);

  if (env.RENDER === "true") {
    const systemQueue = queue;
    const reminders = reminderQueue;
    connection.on("ready", () => {
      if (stopping) return;
      void Promise.all([registerSystemJobSchedules(systemQueue), registerReminderSchedules(reminders)])
        .catch((error: unknown) => logger.error({ error }, "Could not restore job schedules after Redis reconnect"));
    });
  }

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
