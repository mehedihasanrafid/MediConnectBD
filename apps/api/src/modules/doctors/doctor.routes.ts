import { Router, type RequestHandler } from "express";
import type { AuthenticatedLocals } from "../../common/middleware/authenticate";
import { requireRole } from "../../common/middleware/authenticate";
import type { DoctorService } from "./doctor.service";
import type { SchedulingService } from "../scheduling/scheduling.service";
import {
  availabilityQuerySchema,
  createTimeOffSchema,
  replaceScheduleSchema,
  timeOffIdSchema,
} from "../scheduling/scheduling.schemas";
import {
  doctorApplicationQuerySchema,
  doctorIdSchema,
  doctorReviewSchema,
  publicDoctorQuerySchema,
  updateDoctorProfileSchema,
} from "./doctor.schemas";

interface ProtectedRouterOptions {
  doctorService: DoctorService;
  schedulingService: SchedulingService;
  authenticate: RequestHandler;
}

export function createDoctorRouter(options: ProtectedRouterOptions): Router {
  const router = Router();

  router.get("/", async (request, response) => {
    const query = publicDoctorQuerySchema.parse(request.query);
    response.status(200).json(await options.doctorService.listPublic(query));
  });

  router.get(
    "/me",
    options.authenticate,
    requireRole("DOCTOR"),
    async (_request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      response.status(200).json(await options.doctorService.getMyProfile(user.id));
    },
  );

  router.patch(
    "/me",
    options.authenticate,
    requireRole("DOCTOR"),
    async (request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      const input = updateDoctorProfileSchema.parse(request.body);
      response.status(200).json(await options.doctorService.updateMyProfile(user.id, input));
    },
  );

  router.post(
    "/me/submit",
    options.authenticate,
    requireRole("DOCTOR"),
    async (_request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      response.status(200).json(await options.doctorService.submitMyApplication(user.id));
    },
  );

  router.get(
    "/me/schedule",
    options.authenticate,
    requireRole("DOCTOR"),
    async (_request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      response.status(200).json(await options.schedulingService.getMySchedule(user.id));
    },
  );

  router.put(
    "/me/schedule",
    options.authenticate,
    requireRole("DOCTOR"),
    async (request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      const input = replaceScheduleSchema.parse(request.body);
      response
        .status(200)
        .json(await options.schedulingService.replaceMySchedule(user.id, input.rules));
    },
  );

  router.post(
    "/me/time-off",
    options.authenticate,
    requireRole("DOCTOR"),
    async (request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      const input = createTimeOffSchema.parse(request.body);
      response.status(201).json(await options.schedulingService.addMyTimeOff(user.id, input));
    },
  );

  router.delete(
    "/me/time-off/:timeOffId",
    options.authenticate,
    requireRole("DOCTOR"),
    async (request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      const timeOffId = timeOffIdSchema.parse(request.params.timeOffId);
      await options.schedulingService.removeMyTimeOff(user.id, timeOffId);
      response.status(204).send();
    },
  );

  router.post(
    "/me/slots/generate",
    options.authenticate,
    requireRole("DOCTOR"),
    async (_request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      response.status(200).json(await options.schedulingService.regenerateMySlots(user.id));
    },
  );

  router.get("/:doctorId/availability", async (request, response) => {
    const doctorId = doctorIdSchema.parse(request.params.doctorId);
    const query = availabilityQuerySchema.parse(request.query);
    response
      .status(200)
      .json(await options.schedulingService.getPublicAvailability(doctorId, query));
  });

  router.get("/:doctorId", async (request, response) => {
    const doctorId = doctorIdSchema.parse(request.params.doctorId);
    response.status(200).json(await options.doctorService.getPublicProfile(doctorId));
  });

  return router;
}

export function createAdminDoctorRouter(options: ProtectedRouterOptions): Router {
  const router = Router();
  router.use(options.authenticate, requireRole("ADMIN"));

  router.get("/applications", async (request, response) => {
    const query = doctorApplicationQuerySchema.parse(request.query);
    response.status(200).json(await options.doctorService.listApplications(query));
  });

  router.patch("/:doctorId/application", async (request, response) => {
    const user = (response.locals as AuthenticatedLocals).authUser;
    const doctorId = doctorIdSchema.parse(request.params.doctorId);
    const input = doctorReviewSchema.parse(request.body);
    response
      .status(200)
      .json(await options.doctorService.reviewApplication(user.id, doctorId, input));
  });

  return router;
}

export function createCatalogRouter(doctorService: DoctorService): Router {
  const router = Router();

  router.get("/specialties", async (_request, response) => {
    response.status(200).json({ items: await doctorService.listSpecialties() });
  });
  router.get("/hospitals", async (_request, response) => {
    response.status(200).json({ items: await doctorService.listHospitals() });
  });

  return router;
}
