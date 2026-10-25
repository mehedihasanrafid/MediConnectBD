/**
 * Validates family member inputs. Names and relationships are trimmed and bounded; optional
 * date-of-birth and phone follow standard patterns.
 */

import { z } from "zod";

const name = z.string().trim().min(1).max(80);
const relationship = z.string().trim().min(1).max(40);
const phone = z.string().trim().regex(/^\+?\d{7,20}$/).optional().or(z.literal(""));
const dateOfBirth = z.string().date().nullable().optional();

export const createFamilyMemberSchema = z.object({
  name,
  relationship,
  dateOfBirth,
  phone: phone.optional(),
});

export const updateFamilyMemberSchema = z
  .object({
    name: name.optional(),
    relationship: relationship.optional(),
    dateOfBirth: dateOfBirth.optional(),
    phone: phone.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const familyMemberIdSchema = z.string().uuid();
