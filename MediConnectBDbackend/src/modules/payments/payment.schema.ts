/**
 * Validates payer details, opaque IDs, bounded idempotency keys, and the minimal callback
 * reference. Extra provider callback fields are not forwarded as authoritative payment evidence.
 */

import { z } from "zod";

export const paymentIdSchema = z.string().uuid();
export const idempotencyKeySchema = z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/);
export const paymentCustomerSchema = z.object({
  name: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(50),
  phone: z.string().trim().regex(/^\+?\d{7,20}$/),
  address: z.string().trim().min(1).max(50),
  city: z.string().trim().min(1).max(50),
  postcode: z.string().trim().min(1).max(30),
}).strict();
export const paymentCallbackSchema = z.object({
  tran_id: z.string().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/),
  val_id: z.string().min(1).max(100).optional(),
});
