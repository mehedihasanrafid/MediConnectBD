/**
 * Prescription HTTP handlers — validate input, enforce ownership, delegate to services.
 */

import type { RequestHandler as HttpHandler } from "express";
import { type RequestHandler } from "express";
import { AppError } from "../../utils/app-error";
import { type AuthenticatedLocals } from "../auth/auth.middleware";
import type { PrescriptionService } from "./prescription.service";
import { z } from "zod";

const medicineSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
});

const createPrescriptionSchema = z.object({
  appointmentId: z.string().uuid(),
  diagnosis: z.string().min(1).max(5000),
  medicines: z.array(medicineSchema).min(1),
  tests: z.array(z.string().max(200)).optional(),
  advice: z.string().max(2000).optional().nullable(),
}).strict();

const updatePrescriptionSchema = z.object({
  diagnosis: z.string().min(1).max(5000).optional(),
  medicines: z.array(medicineSchema).min(1).optional(),
  tests: z.array(z.string().max(200)).optional(),
  advice: z.string().max(2000).optional().nullable(),
}).strict();

export function createPrescriptionController(options: {
  prescriptionService: PrescriptionService;
  authenticate: RequestHandler;
}) {
  return {
    createPrescription: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const doctorProfileId = getDoctorProfileId(response.locals as AuthenticatedLocals);
      const input = createPrescriptionSchema.parse(request.body);
      response.status(201).json(await options.prescriptionService.createPrescription(doctorProfileId, input));
    },

    listPatientPrescriptions: async (_request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      response.status(200).json({
        items: await options.prescriptionService.getPatientPrescriptions(patientProfileId),
      });
    },

    listDoctorPrescriptions: async (_request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const doctorProfileId = getDoctorProfileId(response.locals as AuthenticatedLocals);
      response.status(200).json({
        items: await options.prescriptionService.getDoctorPrescriptions(doctorProfileId),
      });
    },

    updatePrescription: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const doctorProfileId = getDoctorProfileId(response.locals as AuthenticatedLocals);
      const prescriptionId = z.string().uuid().parse(request.params.prescriptionId);
      const input = updatePrescriptionSchema.parse(request.body);
      response.status(200).json(await options.prescriptionService.updatePrescription(prescriptionId, doctorProfileId, input));
    },

    deletePrescription: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const doctorProfileId = getDoctorProfileId(response.locals as AuthenticatedLocals);
      const prescriptionId = z.string().uuid().parse(request.params.prescriptionId);
      await options.prescriptionService.deletePrescription(prescriptionId, doctorProfileId);
      response.status(204).send();
    },

    verifyPrescription: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const verificationCode = z.string().length(16).parse(request.params.verificationCode);
      const result = await options.prescriptionService.verifyByCode(verificationCode);
      response.status(200).json(result);
    },

    suggestMedicines: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const q = typeof request.query.q === "string" ? request.query.q : "";
      const items = options.prescriptionService.suggestMedicines(q);
      response.status(200).json({ items });
    },

    downloadPrescriptionPdf: async (request: Parameters<HttpHandler>[0], response: Parameters<HttpHandler>[1]) => {
      const prescriptionId = z.string().uuid().parse(request.params.prescriptionId);
      const locals = response.locals as AuthenticatedLocals;
      const result = await options.prescriptionService.getPrescriptionPdf(prescriptionId, {
        patientProfileId: locals.authUser.patientProfileId ?? null,
        doctorProfileId: locals.authUser.doctorProfile?.id ?? null,
      });
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
      response.status(200).send(result.buffer);
    },
  };
}

function getDoctorProfileId(locals: AuthenticatedLocals): string {
  const doctorProfileId = locals.authUser.doctorProfile?.id;
  if (!doctorProfileId) {
    throw new AppError(403, "DOCTOR_PROFILE_REQUIRED", "A doctor profile is required");
  }
  return doctorProfileId;
}

function getPatientProfileId(locals: AuthenticatedLocals): string {
  const patientProfileId = locals.authUser.patientProfileId;
  if (!patientProfileId) {
    throw new AppError(403, "PATIENT_PROFILE_REQUIRED", "A patient profile is required");
  }
  return patientProfileId;
}
