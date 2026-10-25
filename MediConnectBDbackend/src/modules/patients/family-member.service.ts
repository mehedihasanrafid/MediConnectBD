/**
 * Family member business logic: ownership validation, max-members limit, and CRUD operations.
 * All methods derive patient identity from the repository; controllers never accept a patient
 * ID from request bodies.
 */

import { AppError } from "../../utils/app-error";
import type {
  FamilyMemberRepository,
  FamilyMemberView,
  NewFamilyMemberInput,
  UpdateFamilyMemberInput,
} from "./family-member.repository";

const MAX_FAMILY_MEMBERS = 10;

export class FamilyMemberService {
  constructor(private readonly repository: FamilyMemberRepository) {}

  async listByPatient(patientProfileId: string): Promise<FamilyMemberView[]> {
    return this.repository.listByPatient(patientProfileId);
  }

  /**
   * Validates ownership before returning a single family member. Unknown IDs and another
   * patient's members share the same not-found response.
   */
  async getById(id: string, patientProfileId: string): Promise<FamilyMemberView> {
    const member = await this.repository.findById(id, patientProfileId);
    if (!member) {
      throw new AppError(404, "FAMILY_MEMBER_NOT_FOUND", "Family member was not found");
    }
    return member;
  }

  /**
   * Enforces the maximum family members limit before creating a new record. Ownership is
   * validated through the count query; callers never supply a patient ID.
   */
  async create(input: NewFamilyMemberInput): Promise<FamilyMemberView> {
    const count = await this.repository.countByPatient(input.patientProfileId);
    if (count >= MAX_FAMILY_MEMBERS) {
      throw new AppError(
        409,
        "FAMILY_MEMBER_LIMIT_REACHED",
        `A patient can have at most ${MAX_FAMILY_MEMBERS} family members`,
      );
    }
    return this.repository.create(input);
  }

  /**
   * Updates only provided fields; returns null when the member does not belong to the patient.
   */
  async update(
    id: string,
    patientProfileId: string,
    input: UpdateFamilyMemberInput,
  ): Promise<FamilyMemberView> {
    const updated = await this.repository.update(id, patientProfileId, input);
    if (!updated) {
      throw new AppError(404, "FAMILY_MEMBER_NOT_FOUND", "Family member was not found");
    }
    return updated;
  }

  /**
   * Deletes only if the member belongs to the authenticated patient. Returns silently when
   * the record does not exist or ownership does not match.
   */
  async delete(id: string, patientProfileId: string): Promise<void> {
    const deleted = await this.repository.delete(id, patientProfileId);
    if (!deleted) {
      throw new AppError(404, "FAMILY_MEMBER_NOT_FOUND", "Family member was not found");
    }
  }
}
