/**
 * Registers the /api/v1 feature routers and shares authentication dependencies. Preserve public
 * URL prefixes when moving source files; feature routers bind middleware and delegate request
 * handling to controllers.
 */

import { createUserRouter } from "../modules/users/user.routes";
import { Router } from "express";
import {
  createAuthenticate,
} from "../modules/auth/auth.middleware";
import type { AuthRepository } from "../modules/auth/auth.repository";
import { createAuthRouter } from "../modules/auth/auth.routes";
import type { AuthService } from "../modules/auth/auth.service";
import type { AccessTokenService } from "../modules/auth/access-token.service";
import type { DoctorService } from "../modules/doctors/doctor.service";
import type { SchedulingService } from "../modules/scheduling/scheduling.service";
import type { AppointmentService } from "../modules/appointments/appointment.service";
import type { PaymentService } from "../modules/payments/payment.service";
import { createPaymentRouter } from "../modules/payments/payment.routes";
import { createAppointmentRouter } from "../modules/appointments/appointment.routes";
import {
  createAdminDoctorRouter,
  createCatalogRouter,
  createDoctorRouter,
} from "../modules/doctors/doctor.routes";

export interface ApiRouterOptions {
  authService: AuthService;
  authRepository: AuthRepository;
  accessTokens: AccessTokenService;
  doctorService: DoctorService;
  schedulingService: SchedulingService;
  appointmentService: AppointmentService;
  paymentService?: PaymentService;
  secureCookies: boolean;
}

export function createApiRouter(options: ApiRouterOptions): Router {
  const router = Router();
  const authenticate = createAuthenticate(options.accessTokens, options.authRepository);
  if (options.paymentService) router.use(createPaymentRouter(options.paymentService, authenticate));

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

  router.use(createUserRouter(authenticate));

  return router;
}
