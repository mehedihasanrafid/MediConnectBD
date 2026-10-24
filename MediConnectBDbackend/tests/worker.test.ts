import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import {
  EXPIRE_UNPAID_HOLDS_BATCH_SIZE,
  EXPIRE_UNPAID_HOLDS_INTERVAL_MS,
  EXPIRE_UNPAID_HOLDS_JOB,
  createSystemJobProcessor,
  registerSystemJobSchedules,
} from "../src/workers/system-jobs";

describe("system background jobs", () => {
  it("registers one stable, retryable unpaid-hold expiry schedule", async () => {
    const queue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };

    await registerSystemJobSchedules(queue);

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      EXPIRE_UNPAID_HOLDS_JOB,
      { every: EXPIRE_UNPAID_HOLDS_INTERVAL_MS },
      expect.objectContaining({
        name: EXPIRE_UNPAID_HOLDS_JOB,
        data: { version: 1 },
        opts: expect.objectContaining({ attempts: 3 }),
      }),
    );
  });

  it("validates the versioned payload and delegates a bounded batch", async () => {
    const expiryService = {
      expireUnpaidHolds: vi.fn().mockResolvedValue({
        candidates: 2,
        expired: 2,
        protected: 0,
        skipped: 0,
      }),
    };
    const process = createSystemJobProcessor(expiryService);

    const result = await process({
      name: EXPIRE_UNPAID_HOLDS_JOB,
      data: { version: 1 },
    } as Job<unknown>);

    expect(expiryService.expireUnpaidHolds).toHaveBeenCalledWith(
      EXPIRE_UNPAID_HOLDS_BATCH_SIZE,
    );
    expect(result).toMatchObject({ expired: 2 });
  });

  it("rejects unknown payload versions before changing database state", async () => {
    const expiryService = { expireUnpaidHolds: vi.fn() };
    const process = createSystemJobProcessor(expiryService);

    await expect(
      process({ name: EXPIRE_UNPAID_HOLDS_JOB, data: { version: 2 } } as Job<unknown>),
    ).rejects.toBeDefined();
    expect(expiryService.expireUnpaidHolds).not.toHaveBeenCalled();
  });
});
