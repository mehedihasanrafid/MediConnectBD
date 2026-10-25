/**
 * HTTP handlers for family member CRUD operations. All endpoints derive patient identity from
 * authentication context; no client-supplied patient ID is accepted.
 */

import type { Request, RequestHandler, Response } from "express";
import { AppError } from "../../utils/app-error";
import type { AuthenticatedLocals } from "../auth/auth.middleware";
import type { FamilyMemberService } from "./family-member.service";
import {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
  familyMemberIdSchema,
} from "./family-member.schema";

interface FamilyMemberControllerOptions {
  familyMemberService: FamilyMemberService;
}

function getPatientProfileId(locals: AuthenticatedLocals): string {
  const patientProfileId = locals.authUser.patientProfileId;
  if (!patientProfileId) {
    throw new AppError(403, "PATIENT_PROFILE_REQUIRED", "A patient profile is required");
  }
  return patientProfileId;
}

export function createFamilyMemberController(options: FamilyMemberControllerOptions) {
  return {
    listByPatient: async (_request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const members = await options.familyMemberService.listByPatient(patientProfileId);
      response.status(200).json({ items: members });
    },

    getById: async (request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const id = familyMemberIdSchema.parse(request.params.id);
      const member = await options.familyMemberService.getById(id, patientProfileId);
      response.status(200).json(member);
    },

    create: async (request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const input = createFamilyMemberSchema.parse(request.body);
      const member = await options.familyMemberService.create({
        patientProfileId,
        name: input.name,
        relationship: input.relationship,
        dateOfBirth: input.dateOfBirth ?? null,
        phone: input.phone ?? undefined,
      });
      response.status(201).json(member);
    },

    update: async (request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const id = familyMemberIdSchema.parse(request.params.id);
      const rawInput = updateFamilyMemberSchema.parse(request.body);
      const input: Record<string, unknown> = {};
      if (rawInput.name !== undefined) input.name = rawInput.name;
      if (rawInput.relationship !== undefined) input.relationship = rawInput.relationship;
      if (rawInput.dateOfBirth !== undefined) input.dateOfBirth = rawInput.dateOfBirth ?? null;
      if (rawInput.phone !== undefined) input.phone = rawInput.phone;
      const member = await options.familyMemberService.update(id, patientProfileId, input as typeof input);
      response.status(200).json(member);
    },

    delete: async (request: Request, response: Response) => {
      const patientProfileId = getPatientProfileId(response.locals as AuthenticatedLocals);
      const id = familyMemberIdSchema.parse(request.params.id);
      await options.familyMemberService.delete(id, patientProfileId);
      response.status(204).send();
    },
  };
}
