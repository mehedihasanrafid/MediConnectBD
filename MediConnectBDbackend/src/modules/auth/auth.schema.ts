/**
 * Normalizes registration identity input and validates credential shape before services run. Login
 * checks only submitted credential shape; password-strength rules apply when registering a new
 * password.
 */

import { z } from "zod";

const email = z.string().trim().email().max(191).transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");
const name = z.string().trim().min(1).max(80);

export const patientRegistrationSchema = z.object({
  email,
  password,
  firstName: name,
  lastName: name,
  phone: z.string().trim().min(7).max(32).optional(),
});

export const doctorRegistrationSchema = z.object({
  email,
  password,
  firstName: name,
  lastName: name,
  bmdcNumber: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9\-/.]+$/, "BMDC number contains unsupported characters")
    .transform((value) => value.toUpperCase()),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
