import { Router, type RequestHandler } from "express";
import { AppError } from "../../common/errors/app-error";
import {
  requireRole,
  type AuthenticatedLocals,
} from "../../common/middleware/authenticate";
import {
  bookAppointmentSchema,
  createHoldSchema,
  holdIdSchema,
} from "./appointment.schemas";
import type { AppointmentService } from "./appointment.service";

export function createAppointmentRouter(options: {
  appointmentService: AppointmentService;
  authenticate: RequestHandler;
}): Router {
  const router = Router();
  router.use(options.authenticate, requireRole("PATIENT"));

  router.post("/holds", async (request, response) => {
    const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
    const input = createHoldSchema.parse(request.body);
    response
      .status(201)
      .json(await options.appointmentService.holdSlot(patientProfileId, input.slotId));
  });

  router.delete("/holds/:holdId", async (request, response) => {
    const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
    const holdId = holdIdSchema.parse(request.params.holdId);
    await options.appointmentService.releaseHold(patientProfileId, holdId);
    response.status(204).send();
  });

  router.post("/", async (request, response) => {
    const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
    const input = bookAppointmentSchema.parse(request.body);
    response
      .status(201)
      .json(await options.appointmentService.bookAppointment(patientProfileId, input.holdId));
  });

  router.get("/me", async (_request, response) => {
    const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
    response.status(200).json({
      items: await options.appointmentService.listMyAppointments(patientProfileId),
    });
  });

  return router;
}

function getPatientProfileId(locals: AuthenticatedLocals): string {
  const patientProfileId = locals.authUser.patientProfileId;
  if (!patientProfileId) {
    throw new AppError(403, "PATIENT_PROFILE_REQUIRED", "A patient profile is required");
  }
  return patientProfileId;
}
