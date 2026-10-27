/**
 * Routes for `/api/v1/patients/me/reports`. Upload, listing, and deletion require PATIENT role;
 * downloading a report allows either the owning PATIENT or a treating DOCTOR (never ADMIN).
 */

import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import { createMedicalReportController } from "./medical-report.controller";
import type { MedicalReportService } from "./medical-report.service";

export function createMedicalReportRouter(
  service: MedicalReportService,
  authenticate: RequestHandler,
): Router {
  const controller = createMedicalReportController({ medicalReportService: service });
  const router = Router();

  router.get("/", authenticate, requireRole("PATIENT"), controller.listByPatient);
  router.post("/", authenticate, requireRole("PATIENT"), controller.create);
  router.get(
    "/:reportId/download",
    authenticate,
    requireRole("PATIENT", "DOCTOR"),
    controller.download,
  );
  router.delete("/:reportId", authenticate, requireRole("PATIENT"), controller.delete);

  return router;
}
