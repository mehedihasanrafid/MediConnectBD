import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type {
  FamilyMemberRepository,
  FamilyMemberView,
  NewFamilyMemberInput,
  UpdateFamilyMemberInput,
} from "../src/modules/patients/family-member.repository";
import { FamilyMemberService } from "../src/modules/patients/family-member.service";

class FakeFamilyMemberRepository implements FamilyMemberRepository {
  members = new Map<string, FamilyMemberView>();
  nextId = 1;

  private _timeOffset = 0;

  async listByPatient(patientProfileId: string): Promise<FamilyMemberView[]> {
    return [...this.members.values()]
      .filter((m) => m.patientProfileId === patientProfileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: string, patientProfileId: string): Promise<FamilyMemberView | null> {
    const member = this.members.get(id);
    if (!member || member.patientProfileId !== patientProfileId) return null;
    return member;
  }

  private _timeOffset = 0;

  async create(input: NewFamilyMemberInput): Promise<FamilyMemberView> {
    this._timeOffset += 10;
    const id = randomUUID();
    const now = new Date(Date.now() + this._timeOffset);
    const member: FamilyMemberView = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.members.set(id, member);
    return member;
  }

  async update(
    id: string,
    patientProfileId: string,
    input: UpdateFamilyMemberInput,
  ): Promise<FamilyMemberView | null> {
    const existing = this.members.get(id);
    if (!existing || existing.patientProfileId !== patientProfileId) return null;
    const updated = { ...existing, ...input, updatedAt: new Date() };
    this.members.set(id, updated);
    return updated;
  }

  async delete(id: string, patientProfileId: string): Promise<boolean> {
    const existing = this.members.get(id);
    if (!existing || existing.patientProfileId !== patientProfileId) return false;
    this.members.delete(id);
    return true;
  }

  async countByPatient(patientProfileId: string): Promise<number> {
    return [...this.members.values()].filter(
      (m) => m.patientProfileId === patientProfileId,
    ).length;
  }
}

describe("FamilyMemberService", () => {
  it("creates a family member and returns it with generated id", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const patientProfileId = randomUUID();

    const result = await service.create({
      patientProfileId,
      name: "Child One",
      relationship: "child",
      dateOfBirth: "2015-06-15",
      phone: "+8801700000001",
    });

    expect(result.id).toBeTruthy();
    expect(result.name).toBe("Child One");
    expect(result.relationship).toBe("child");
    expect(result.dateOfBirth).toBe("2015-06-15");
    expect(result.phone).toBe("+8801700000001");
    expect(result.patientProfileId).toBe(patientProfileId);
  });

  it("rejects creation when max family members limit is reached", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const patientProfileId = randomUUID();

    // Pre-populate with 10 members to hit the limit
    for (let i = 1; i <= 10; i++) {
      await repository.create({
        patientProfileId,
        name: `Member ${i}`,
        relationship: "relative",
      });
    }

    await expect(
      service.create({
        patientProfileId,
        name: "Member 11",
        relationship: "relative",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "FAMILY_MEMBER_LIMIT_REACHED",
    });
  });

  it("lists all family members for a patient ordered by newest first", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const patientProfileId = randomUUID();

    await repository.create({
      patientProfileId,
      name: "First Added",
      relationship: "parent",
    });
    await repository.create({
      patientProfileId,
      name: "Second Added",
      relationship: "spouse",
    });

    const members = await service.listByPatient(patientProfileId);
    expect(members).toHaveLength(2);
    expect(members[0].name).toBe("Second Added");
    expect(members[1].name).toBe("First Added");
  });

  it("returns a family member by id when ownership matches", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const patientProfileId = randomUUID();

    const created = await repository.create({
      patientProfileId,
      name: "Test Member",
      relationship: "sibling",
    });

    const result = await service.getById(created.id, patientProfileId);
    expect(result.name).toBe("Test Member");
    expect(result.relationship).toBe("sibling");
  });

  it("throws not-found when another patient requests the member", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const ownerProfileId = randomUUID();
    const otherProfileId = randomUUID();

    const created = await repository.create({
      patientProfileId: ownerProfileId,
      name: "Owned Member",
      relationship: "parent",
    });

    await expect(
      service.getById(created.id, otherProfileId),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "FAMILY_MEMBER_NOT_FOUND",
    });
  });

  it("updates an existing family member", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const patientProfileId = randomUUID();

    const created = await repository.create({
      patientProfileId,
      name: "Old Name",
      relationship: "parent",
    });

    const updated = await service.update(created.id, patientProfileId, {
      name: "New Name",
    });

    expect(updated.name).toBe("New Name");
    expect(updated.relationship).toBe("parent");
  });

  it("throws not-found when updating another patient's member", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const ownerProfileId = randomUUID();
    const otherProfileId = randomUUID();

    const created = await repository.create({
      patientProfileId: ownerProfileId,
      name: "Owned Member",
      relationship: "parent",
    });

    await expect(
      service.update(created.id, otherProfileId, { name: "Hacked" }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "FAMILY_MEMBER_NOT_FOUND",
    });
  });

  it("deletes a family member successfully", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const patientProfileId = randomUUID();

    const created = await repository.create({
      patientProfileId,
      name: "To Delete",
      relationship: "friend",
    });

    await service.delete(created.id, patientProfileId);

    const remaining = await service.listByPatient(patientProfileId);
    expect(remaining).toHaveLength(0);
  });

  it("throws not-found when deleting another patient's member", async () => {
    const repository = new FakeFamilyMemberRepository();
    const service = new FamilyMemberService(repository);
    const ownerProfileId = randomUUID();
    const otherProfileId = randomUUID();

    const created = await repository.create({
      patientProfileId: ownerProfileId,
      name: "Owned Member",
      relationship: "parent",
    });

    await expect(
      service.delete(created.id, otherProfileId),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "FAMILY_MEMBER_NOT_FOUND",
    });
  });
});
