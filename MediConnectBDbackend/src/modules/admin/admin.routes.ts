/**
 * Admin routes. Every endpoint requires an authenticated ADMIN account.
 */

import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import { createAdminController } from "./admin.controller";
import type { AdminService } from "./admin.service";

export function createAdminRouter(options: {
  adminService: AdminService;
  authenticate: RequestHandler;
}): Router {
  const controller = createAdminController(options);
  const router = Router();

  router.use(options.authenticate, requireRole("ADMIN"));

  router.get("/overview", controller.getOverview);

  router.get("/users", controller.listUsers);
  router.patch("/users/:userId/status", controller.updateUserStatus);

  router.get("/specialties", controller.listSpecialties);
  router.post("/specialties", controller.createSpecialty);
  router.put("/specialties/:specialtyId", controller.updateSpecialty);
  router.delete("/specialties/:specialtyId", controller.deleteSpecialty);

  router.get("/hospitals", controller.listHospitals);
  router.post("/hospitals", controller.createHospital);
  router.put("/hospitals/:hospitalId", controller.updateHospital);
  router.delete("/hospitals/:hospitalId", controller.deleteHospital);

  router.get("/appointments", controller.listAppointments);
  router.get("/payments", controller.listPayments);

  router.get("/refunds", controller.listRefunds);
  router.post("/refunds/:refundId/submit", controller.submitRefund);

  return router;
}
