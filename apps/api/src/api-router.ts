import { Router } from "express";
import {
  createAuthenticate,
  type AuthenticatedLocals,
} from "./common/middleware/authenticate";
import type { AuthRepository } from "./modules/auth/auth.repository";
import { createAuthRouter } from "./modules/auth/auth.routes";
import type { AuthService } from "./modules/auth/auth.service";
import type { AccessTokenService } from "./modules/auth/access-token.service";
import type { DoctorService } from "./modules/doctors/doctor.service";
import type { SchedulingService } from "./modules/scheduling/scheduling.service";
import type { AppointmentService } from "./modules/appointments/appointment.service";
import { createAppointmentRouter } from "./modules/appointments/appointment.routes";
import {
  createAdminDoctorRouter,
  createCatalogRouter,
  createDoctorRouter,
} from "./modules/doctors/doctor.routes";

export interface ApiRouterOptions {
  authService: AuthService;
  authRepository: AuthRepository;
  accessTokens: AccessTokenService;
  doctorService: DoctorService;
  schedulingService: SchedulingService;
  appointmentService: AppointmentService;
  secureCookies: boolean;
}

export function createApiRouter(options: ApiRouterOptions): Router {
  const router = Router();
  const authenticate = createAuthenticate(options.accessTokens, options.authRepository);

  router.use(
    "/auth",
    createAuthRouter({
      authService: options.authService,
      secureCookies: options.secureCookies,
    }),
  );

  router.use(
    "/doctors",
    createDoctorRouter({
      doctorService: options.doctorService,
      schedulingService: options.schedulingService,
      authenticate,
    }),
  );
  router.use(
    "/admin/doctors",
    createAdminDoctorRouter({
      doctorService: options.doctorService,
      schedulingService: options.schedulingService,
      authenticate,
    }),
  );
  router.use("/catalog", createCatalogRouter(options.doctorService));
  router.use(
    "/appointments",
    createAppointmentRouter({
      appointmentService: options.appointmentService,
      authenticate,
    }),
  );

  router.get("/me", authenticate, (_request, response) => {
    const user = (response.locals as AuthenticatedLocals).authUser;
    response.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.roles,
      patientProfileId: user.patientProfileId,
      doctorProfile: user.doctorProfile,
    });
  });

  return router;
}
