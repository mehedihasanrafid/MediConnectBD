import { Router } from "express";

export interface ReadinessChecks {
  database: () => Promise<void>;
  redis: () => Promise<void>;
}

export function createHealthRouter(checks: ReadinessChecks): Router {
  const router = Router();

  router.get("/live", (_request, response) => {
    response.status(200).json({ status: "ok", service: "mediconnect-api" });
  });

  router.get("/ready", async (_request, response) => {
    const [database, redis] = await Promise.allSettled([
      checks.database(),
      checks.redis(),
    ]);

    const dependencies = {
      database: database.status === "fulfilled" ? "up" : "down",
      redis: redis.status === "fulfilled" ? "up" : "down",
    } as const;
    const ready = database.status === "fulfilled" && redis.status === "fulfilled";

    response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      dependencies,
    });
  });

  return router;
}
