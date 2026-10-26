/**
 * Accepts only the selected slot or hold identifier for booking commands. The patient identity
 * comes from authenticated context, preventing callers from booking against a supplied patient ID.
 */

import { z } from "zod";

export const createHoldSchema = z.object({
  slotId: z.string().uuid(),
});

export const bookAppointmentSchema = z.object({
  holdId: z.string().uuid(),
});

export const holdIdSchema = z.string().uuid();

export const appointmentIdSchema = z.string().uuid();

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500).optional().default(""),
});
