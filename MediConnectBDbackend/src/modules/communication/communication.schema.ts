/**
 * Zod validation schemas for Communication API endpoints.
 */

import { z } from "zod";

export const createMessageSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Message content cannot be empty")
      .max(2000, "Message content cannot exceed 2000 characters"),
    idempotencyKey: z
      .string()
      .trim()
      .min(1, "Idempotency key cannot be empty")
      .max(128, "Idempotency key cannot exceed 128 characters")
      .optional()
      .nullable(),
  })
  .strict();

export const listMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    before: z.string().uuid("Invalid cursor UUID").optional(),
  })
  .strict();

export const conversationIdParamSchema = z.string().uuid("Invalid conversation UUID");
