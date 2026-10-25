/**
 * TypeORM implementation of the family member repository. All queries include patient profile
 * ownership checks; callers never receive another patient's family members.
 */

import AppDataSource from "../../database/data-source";
import { FamilyMember } from "./family-member.entity";
import type {
  FamilyMemberRepository,
  FamilyMemberView,
  NewFamilyMemberInput,
  UpdateFamilyMemberInput,
} from "./family-member.repository";

function toView(member: FamilyMember): FamilyMemberView {
  return {
    id: member.id,
    patientProfileId: member.patientProfileId,
    name: member.name,
    relationship: member.relationship,
    dateOfBirth: member.dateOfBirth,
    phone: member.phone,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export class TypeOrmFamilyMemberRepository implements FamilyMemberRepository {
  private get repository() {
    return AppDataSource.getRepository(FamilyMember);
  }

  async listByPatient(patientProfileId: string): Promise<FamilyMemberView[]> {
    const members = await this.repository.find({
      where: { patientProfileId },
      order: { createdAt: "DESC" },
    });
    return members.map(toView);
  }

  async findById(id: string, patientProfileId: string): Promise<FamilyMemberView | null> {
    const member = await this.repository.findOne({
      where: { id, patientProfileId },
    });
    return member ? toView(member) : null;
  }

  async create(input: NewFamilyMemberInput): Promise<FamilyMemberView> {
    const member = this.repository.create({
      patientProfileId: input.patientProfileId,
      name: input.name,
      relationship: input.relationship,
      dateOfBirth: input.dateOfBirth ?? null,
      phone: input.phone ?? null,
    });
    const saved = await this.repository.save(member);
    return toView(saved);
  }

  async update(
    id: string,
    patientProfileId: string,
    input: UpdateFamilyMemberInput,
  ): Promise<FamilyMemberView | null> {
    const member = await this.repository.findOne({
      where: { id, patientProfileId },
    });
    if (!member) return null;

    if (input.name !== undefined) member.name = input.name;
    if (input.relationship !== undefined) member.relationship = input.relationship;
    if (input.dateOfBirth !== undefined) member.dateOfBirth = input.dateOfBirth ?? null;
    if (input.phone !== undefined) member.phone = input.phone ?? null;

    const updated = await this.repository.save(member);
    return toView(updated);
  }

  async delete(id: string, patientProfileId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, patientProfileId });
    return result.affected !== 0 && result.affected !== null;
  }

  async countByPatient(patientProfileId: string): Promise<number> {
    return this.repository.count({ where: { patientProfileId } });
  }
}
