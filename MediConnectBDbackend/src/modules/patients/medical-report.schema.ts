/**
 * Request schemas for uploading and identifying patient medical reports.
 */

import { z } from "zod";

export const createMedicalReportSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(100),
    contentBase64: z.string().trim().min(1).max(2_800_000),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const medicalReportIdSchema = z.string().uuid();
