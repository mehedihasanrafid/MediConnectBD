/**
 * Binds doctor/profile/admin/catalog routes and mounts scheduling under the existing doctor
 * prefix. Static /me endpoints are registered before /:doctorId so they cannot be mistaken for
 * UUID parameters.
 */

import { createSchedulingRouter } from "../scheduling/scheduling.routes";
import { createDoctorController, createAdminDoctorController, createCatalogController } from './doctor.controller';
import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import type { DoctorService } from "./doctor.service";
import type { SchedulingService } from "../scheduling/scheduling.service";
interface ProtectedRouterOptions {
    doctorService: DoctorService;
    schedulingService: SchedulingService;
    authenticate: RequestHandler;
}
export function createDoctorRouter(options: ProtectedRouterOptions): Router {
    const controller = createDoctorController(options);
    const router = Router();
    router.get("/", controller.listPublic);
    router.get("/me", options.authenticate, requireRole("DOCTOR"), controller.getMyProfile);
    router.patch("/me", options.authenticate, requireRole("DOCTOR"), controller.updateMyProfile);
    router.post("/me/submit", options.authenticate, requireRole("DOCTOR"), controller.submitApplication);
    router.use(createSchedulingRouter(options));
    router.get("/:doctorId", controller.getPublicProfile);
    return router;
}
export function createAdminDoctorRouter(options: ProtectedRouterOptions): Router {
    const controller = createAdminDoctorController(options);
    const router = Router();
    router.use(options.authenticate, requireRole("ADMIN"));
    router.get("/applications", controller.listApplications);
    router.patch("/:doctorId/application", controller.reviewApplication);
    return router;
}
export function createCatalogRouter(doctorService: DoctorService): Router {
    const controller = createCatalogController(doctorService);
    const router = Router();
    router.get("/specialties", controller.listSpecialties);
    router.get("/hospitals", controller.listHospitals);
    return router;
}
