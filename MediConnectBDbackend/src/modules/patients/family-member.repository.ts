/**
 * Persistence port for family member CRUD operations. Implementations own ownership checks;
 * business code receives result unions instead of driver-specific exceptions.
 */

import type { FamilyMember } from "./family-member.entity";

export interface NewFamilyMemberInput {
  patientProfileId: string;
  name: string;
  relationship: string;
  dateOfBirth?: string | null | undefined;
  phone?: string | null | undefined;
}

export interface UpdateFamilyMemberInput {
  name?: string | undefined;
  relationship?: string | undefined;
  dateOfBirth?: string | null | undefined;
  phone?: string | null | undefined;
}

export interface FamilyMemberView {
  id: string;
  patientProfileId: string;
  name: string;
  relationship: string;
  dateOfBirth: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMemberRepository {
  listByPatient(patientProfileId: string): Promise<FamilyMemberView[]>;
  findById(id: string, patientProfileId: string): Promise<FamilyMemberView | null>;
  create(input: NewFamilyMemberInput): Promise<FamilyMemberView>;
  update(
    id: string,
    patientProfileId: string,
    input: UpdateFamilyMemberInput,
  ): Promise<FamilyMemberView | null>;
  delete(id: string, patientProfileId: string): Promise<boolean>;
  countByPatient(patientProfileId: string): Promise<number>;
}
