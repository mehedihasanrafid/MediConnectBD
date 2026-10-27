/**
 * HTTP handlers for patient medical report upload, listing, download, and deletion.
 */

import type { Request, Response } from "express";
import { AppError } from "../../utils/app-error";
import type { AuthenticatedLocals } from "../auth/auth.middleware";
import { createMedicalReportSchema, medicalReportIdSchema } from "./medical-report.schema";
import type { MedicalReportService } from "./medical-report.service";

function getPatientProfileId(locals: AuthenticatedLocals): string {
  const patientProfileId = locals.authUser.patientProfileId;
  if (!patientProfileId) {
    throw new AppError(403, "PATIENT_PROFILE_REQUIRED", "A patient profile is required");
  }
  return patientProfileId;
}

export function createMedicalReportController(options: {
  medicalReportService: MedicalReportService;
}) {
  return {
    listByPatient: async (_request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const items = await options.medicalReportService.listByPatient(patientProfileId);
      response.status(200).json({ items });
    },

    create: async (request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const input = createMedicalReportSchema.parse(request.body);
      const report = await options.medicalReportService.create({
        patientProfileId,
        title: input.title,
        fileName: input.fileName,
        mimeType: input.mimeType,
        contentBase64: input.contentBase64,
        notes: input.notes ?? null,
      });
      response.status(201).json(report);
    },

    download: async (request: Request, response: Response) => {
      const reportId = medicalReportIdSchema.parse(request.params.reportId);
      const locals = response.locals as AuthenticatedLocals;
      const report = await options.medicalReportService.getForDownload(reportId, {
        patientProfileId: locals.authUser.patientProfileId ?? null,
        doctorProfileId: locals.authUser.doctorProfile?.id ?? null,
      });
      response.status(200).json(report);
    },

    delete: async (request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const reportId = medicalReportIdSchema.parse(request.params.reportId);
      await options.medicalReportService.delete(reportId, patientProfileId);
      response.status(204).send();
    },
  };
}
