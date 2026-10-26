/**
 * Zod schemas for admin request validation. Keep these aligned with the OpenAPI contracts.
 */

import { z } from "zod";
import { UserStatus } from "../users/user.entity";

const userStatusSchema = z.nativeEnum(UserStatus);

const slugSchema = z
  .string()
  .min(2)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens");

export const adminUsersQuerySchema = z
  .object({
    status: userStatusSchema.optional(),
    role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).optional(),
    search: z.string().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const updateUserStatusSchema = z
  .object({ status: userStatusSchema })
  .strict();

export const createSpecialtySchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: slugSchema,
  })
  .strict();

export const updateSpecialtySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const createHospitalSchema = z
  .object({
    name: z.string().min(2).max(180),
    slug: slugSchema,
    area: z.string().min(1).max(120),
    address: z.string().min(1).max(500),
  })
  .strict();

export const updateHospitalSchema = z
  .object({
    name: z.string().min(2).max(180).optional(),
    slug: slugSchema.optional(),
    area: z.string().min(1).max(120).optional(),
    address: z.string().min(1).max(500).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const adminAppointmentQuerySchema = z
  .object({
    status: z
      .enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "PAYMENT_EXPIRED", "COMPLETED", "NO_SHOW"])
      .optional(),
    doctorId: z.string().uuid().optional(),
    patientProfileId: z.string().uuid().optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const adminPaymentQuerySchema = z
  .object({
    status: z
      .enum(["INITIATED", "PENDING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REVIEW_REQUIRED"])
      .optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const adminRefundQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const adminIdParamSchema = z.string().uuid();
