import { z } from "zod";

export const createHoldSchema = z.object({
  slotId: z.string().uuid(),
});

export const bookAppointmentSchema = z.object({
  holdId: z.string().uuid(),
});

export const holdIdSchema = z.string().uuid();
