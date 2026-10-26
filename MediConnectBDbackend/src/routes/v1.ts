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
import { createFamilyMemberRouter } from "../modules/patients/family-member.routes";
import type { FamilyMemberService } from "../modules/patients/family-member.service";
import { TypeOrmFamilyMemberRepository } from "../modules/patients/typeorm-family-member.repository";
import type { ReviewService } from "../modules/reviews/review.service";
import { createReviewRouter } from "../modules/reviews/review.routes";
import type { PrescriptionService } from "../modules/prescriptions/prescription.service";
import { createPrescriptionRouter } from "../modules/prescriptions/prescription.routes";
import type { AdminService } from "../modules/admin/admin.service";
import { createAdminRouter } from "../modules/admin/admin.routes";

export interface ApiRouterOptions {
  authService: AuthService;
  authRepository: AuthRepository;
  accessTokens: AccessTokenService;
  doctorService: DoctorService;
  schedulingService: SchedulingService;
  appointmentService: AppointmentService;
  paymentService?: PaymentService;
  familyMemberService?: FamilyMemberService;
  reviewService?: ReviewService;
  prescriptionService?: PrescriptionService;
  adminService?: AdminService;
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

  if (options.familyMemberService) {
    router.use(
      "/patients/me/family-members",
      createFamilyMemberRouter(options.familyMemberService, authenticate),
    );
  }

  if (options.reviewService) {
    router.use("/reviews", createReviewRouter({
      reviewService: options.reviewService,
      authenticate,
    }));
  }

  if (options.prescriptionService) {
    router.use("/prescriptions", createPrescriptionRouter({
      prescriptionService: options.prescriptionService,
      authenticate,
    }));
  }

  if (options.adminService) {
    router.use("/admin", createAdminRouter({
      adminService: options.adminService,
      authenticate,
    }));
  }

  return router;
}
