/**
 * Request schemas for uploading and identifying patient medical reports.
 */

import { z } from "zod";

export const ALLOWED_REPORT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

export type AllowedReportMimeType = (typeof ALLOWED_REPORT_MIME_TYPES)[number];

export const createMedicalReportSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.enum(ALLOWED_REPORT_MIME_TYPES, {
      message:
        "Unsupported file type. Allowed formats: application/pdf, image/jpeg, image/png, image/webp, text/plain",
    }),
    contentBase64: z.string().trim().min(1).max(2_800_000),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const medicalReportIdSchema = z.string().uuid();
