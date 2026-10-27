/**
 * Appointment hold/booking/history routes and status transitions. Hold, booking, and history
 * require PATIENT; cancellation supports PATIENT, DOCTOR, or ADMIN; completion and no-show
 * require DOCTOR. Resource ownership and expiry belong to the service/repository workflow.
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
    router.post("/holds", options.authenticate, requireRole("PATIENT"), controller.holdSlot);
    router.delete("/holds/:holdId", options.authenticate, requireRole("PATIENT"), controller.releaseHold);
    router.post("/", options.authenticate, requireRole("PATIENT"), controller.bookAppointment);
    router.get("/me", options.authenticate, requireRole("PATIENT"), controller.listMyAppointments);
    router.post("/:appointmentId/reschedule", options.authenticate, requireRole("PATIENT"), controller.rescheduleAppointment);
    router.get("/:appointmentId/video-session", options.authenticate, requireRole("PATIENT", "DOCTOR"), controller.getVideoSession);
    router.post("/:appointmentId/cancel", options.authenticate, requireRole("PATIENT", "DOCTOR", "ADMIN"), controller.cancelAppointment);
    router.post("/:appointmentId/complete", options.authenticate, requireRole("DOCTOR"), controller.completeAppointment);
    router.post("/:appointmentId/no-show", options.authenticate, requireRole("DOCTOR"), controller.markNoShow);
    return router;
}
