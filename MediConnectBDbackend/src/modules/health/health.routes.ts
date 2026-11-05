/**
 * Mounts /health/live and /health/ready outside the /api/v1 prefix. The controller receives
 * dependency-check functions so HTTP tests do not need running infrastructure.
 */

import { createHealthController } from './health.controller';
import { Router } from "express";
export interface ReadinessChecks {
    database: () => Promise<void>;
    redis: () => Promise<void>;
}
export function createHealthRouter(checks: ReadinessChecks): Router {
    const controller = createHealthController(checks);
    const router = Router();
    router.get("/", controller.live);
    router.get("/live", controller.live);
    router.get("/ready", controller.ready);
    return router;
}
