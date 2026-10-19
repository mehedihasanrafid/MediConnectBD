/**
 * Scheduling bindings mounted beneath /api/v1/doctors by doctor.routes.ts. Doctor mutations
 * require authentication/DOCTOR role, while public availability is intentionally readable without
 * login.
 */

import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import { createSchedulingController, type SchedulingControllerOptions } from "./scheduling.controller";

export function createSchedulingRouter(options: SchedulingControllerOptions & { authenticate: RequestHandler }): Router {
  const router = Router();
  const controller = createSchedulingController(options);
  router.get("/me/schedule", options.authenticate, requireRole("DOCTOR"), controller.getMySchedule);
  router.put("/me/schedule", options.authenticate, requireRole("DOCTOR"), controller.replaceMySchedule);
  router.post("/me/time-off", options.authenticate, requireRole("DOCTOR"), controller.addTimeOff);
  router.delete("/me/time-off/:timeOffId", options.authenticate, requireRole("DOCTOR"), controller.removeTimeOff);
  router.post("/me/slots/generate", options.authenticate, requireRole("DOCTOR"), controller.generateSlots);
  router.get("/:doctorId/availability", controller.getAvailability);
  return router;
}
