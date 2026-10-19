/**
 * All hold/booking/history routes share authentication and the PATIENT role gate. Resource
 * ownership and expiry still belong to the service/repository workflow.
 */

import { createAppointmentController } from './appointment.controller';
import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import type { AppointmentService } from "./appointment.service";
export function createAppointmentRouter(options: {
    appointmentService: AppointmentService;
    authenticate: RequestHandler;
}): Router {
    const controller = createAppointmentController(options);
    const router = Router();
    router.use(options.authenticate, requireRole("PATIENT"));
    router.post("/holds", controller.holdSlot);
    router.delete("/holds/:holdId", controller.releaseHold);
    router.post("/", controller.bookAppointment);
    router.get("/me", controller.listMyAppointments);
    return router;
}
