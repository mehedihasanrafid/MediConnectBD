/**
 * Liveness reports a running HTTP process; readiness checks MySQL and Redis independently and
 * fails closed if either is unavailable. Health responses intentionally omit connection details
 * and credentials.
 */

import type { RequestHandler as HttpHandler } from "express";
export interface ReadinessChecks {
    database: () => Promise<void>;
    redis: () => Promise<void>;
}
/**
 * HTTP handlers: validate input, call services, and format responses.
 */
export function createHealthController(checks: ReadinessChecks) {
    return {
        live: (_request, response) => {
            response.status(200).json({ status: "ok", service: "mediconnect-api" });
        },
        ready: async (_request, response) => {
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
        },
    } satisfies Record<string, HttpHandler>;
}
