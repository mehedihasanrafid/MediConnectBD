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
  router.use(options.authenticate, requireRole("DOCTOR"));
  router.post("/me/prescriptions", controller.createPrescription.bind(controller));
  router.get("/me/prescriptions", controller.listDoctorPrescriptions.bind(controller));
  router.put("/:prescriptionId", controller.updatePrescription.bind(controller));
  router.delete("/:prescriptionId", controller.deletePrescription.bind(controller));

  // Patient route (authenticated)
  router.use(options.authenticate, requireRole("PATIENT"));
  router.get("/patients/me/prescriptions", controller.listPatientPrescriptions.bind(controller));

  // Public route — verify prescription by code
  router.get("/verify/:verificationCode", controller.verifyPrescription.bind(controller));

  return router;
}
