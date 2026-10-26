/**
 * Patient family members domain API functions.
 */

import type { FamilyMember } from "../shared/types";
import { api } from "./client";

export interface UpsertFamilyMemberInput {
  name: string;
  relationship: string;
  dateOfBirth?: string | null;
  phone?: string;
}

export const familyMembersApi = {
  list: () => api.get<{ items: FamilyMember[] }>("/patients/me/family-members"),
  getById: (id: string) => api.get<FamilyMember>(`/patients/me/family-members/${id}`),
  create: (input: UpsertFamilyMemberInput) =>
    api.post<FamilyMember>("/patients/me/family-members", input),
  update: (id: string, input: Partial<UpsertFamilyMemberInput>) =>
    api.patch<FamilyMember>(`/patients/me/family-members/${id}`, input),
  remove: (id: string) => api.delete<void>(`/patients/me/family-members/${id}`),
};
