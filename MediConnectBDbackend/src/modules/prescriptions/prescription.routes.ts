/**
 * Prescription routes — doctor can create/update/delete their prescriptions,
 * patient can view theirs, anyone can verify by code.
 */

import { createPrescriptionController } from "./prescription.controller";
import { Router, type RequestHandler } from "express";
import { requireRole } from "../auth/auth.middleware";
import type { PrescriptionService } from "./prescription.service";

export function createPrescriptionRouter(options: {
  prescriptionService: PrescriptionService;
  authenticate: RequestHandler;
}): Router {
  const controller = createPrescriptionController(options);
  const router = Router();

  // Doctor routes (authenticated)
  router.post("/me/prescriptions", options.authenticate, requireRole("DOCTOR"), controller.createPrescription.bind(controller));
  router.get("/me/prescriptions", options.authenticate, requireRole("DOCTOR"), controller.listDoctorPrescriptions.bind(controller));
  router.put("/:prescriptionId", options.authenticate, requireRole("DOCTOR"), controller.updatePrescription.bind(controller));
  router.delete("/:prescriptionId", options.authenticate, requireRole("DOCTOR"), controller.deletePrescription.bind(controller));

  // Patient route (authenticated)
  router.get("/patients/me/prescriptions", options.authenticate, requireRole("PATIENT"), controller.listPatientPrescriptions.bind(controller));

  // Public route — verify prescription by code
  router.get("/verify/:verificationCode", controller.verifyPrescription.bind(controller));

  return router;
}
