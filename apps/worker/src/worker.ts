import "dotenv/config";
import { Worker } from "bullmq";
import Redis from "ioredis";
import pino from "pino";
import { z } from "zod";

const env = z
  .object({
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .parse(process.env);

const logger = pino({ level: env.LOG_LEVEL });
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "system-jobs",
  async (job) => {
    if (job.name === "healthcheck") {
      return { handledAt: new Date().toISOString() };
    }

    throw new Error(`Unsupported job type: ${job.name}`);
  },
  { connection },
);

worker.on("ready", () => logger.info("Background worker is ready"));
worker.on("completed", (job) => logger.info({ jobId: job.id, jobName: job.name }, "Job completed"));
worker.on("failed", (job, error) =>
  logger.error({ jobId: job?.id, jobName: job?.name, error }, "Job failed"),
);
worker.on("error", (error) => logger.error({ error }, "Worker error"));

let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, "Shutting down worker");
  await worker.close();
  await connection.quit();
}

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
