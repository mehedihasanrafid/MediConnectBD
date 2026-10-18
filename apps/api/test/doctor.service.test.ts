import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DoctorApplicationStatus } from "../src/database/entities/doctor-profile.entity";
import type { DoctorRepository } from "../src/modules/doctors/doctor.repository";
import { DoctorService } from "../src/modules/doctors/doctor.service";
import type {
  CatalogHospital,
  CatalogSpecialty,
  DoctorApplicationQuery,
  DoctorProfileDetails,
  DoctorReviewInput,
  Paginated,
  PublicDoctorProfile,
  PublicDoctorQuery,
  UpdateDoctorProfileInput,
} from "../src/modules/doctors/doctor.types";

function profile(
  status: DoctorApplicationStatus = DoctorApplicationStatus.DRAFT,
): DoctorProfileDetails {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    email: "doctor@example.com",
    firstName: "Test",
    lastName: "Doctor",
    bmdcNumber: "DEMO-123",
    degrees: "MBBS",
    experienceYears: 5,
    bio: "Demo biography",
    photoUrl: null,
    languages: ["Bangla"],
    videoConsultationFee: 800,
    applicationStatus: status,
    reviewedAt: null,
    reviewedByUserId: null,
    rejectionReason: null,
    specialties: [{ id: randomUUID(), name: "Medicine", slug: "medicine" }],
    chambers: [],
    createdAt: new Date("2026-10-18T00:00:00Z"),
    updatedAt: new Date("2026-10-18T00:00:00Z"),
  };
}

class FakeDoctorRepository implements DoctorRepository {
  current: DoctorProfileDetails | null;
  lastResetApproval = false;

  constructor(current: DoctorProfileDetails | null) {
    this.current = current;
  }

  async findByUserId(): Promise<DoctorProfileDetails | null> {
    return this.current;
  }

  async updateProfile(
    _doctorId: string,
    input: UpdateDoctorProfileInput,
    resetApproval: boolean,
  ): Promise<DoctorProfileDetails> {
    if (!this.current) throw new Error("Missing fake profile");
    this.lastResetApproval = resetApproval;
    this.current = {
      ...this.current,
      ...input,
      applicationStatus: resetApproval
        ? DoctorApplicationStatus.DRAFT
        : this.current.applicationStatus,
      updatedAt: new Date("2026-10-18T01:00:00Z"),
    } as DoctorProfileDetails;
    return this.current;
  }

  async submitApplication(): Promise<DoctorProfileDetails | null> {
    if (!this.current) return null;
    this.current.applicationStatus = DoctorApplicationStatus.PENDING_REVIEW;
    return this.current;
  }

  async listApplications(
    query: DoctorApplicationQuery,
  ): Promise<Paginated<DoctorProfileDetails>> {
    const items = this.current ? [this.current] : [];
    return { items, page: query.page, limit: query.limit, total: items.length, totalPages: 1 };
  }

  async reviewApplication(
    _doctorId: string,
    adminUserId: string,
    input: DoctorReviewInput,
  ): Promise<DoctorProfileDetails | null> {
    if (!this.current?.applicationStatus.includes("PENDING")) return null;
    this.current.applicationStatus = input.decision;
    this.current.reviewedByUserId = adminUserId;
    this.current.rejectionReason =
      input.decision === DoctorApplicationStatus.REJECTED ? input.reason : null;
    return this.current;
  }

  async listPublic(
    query: PublicDoctorQuery,
  ): Promise<Paginated<PublicDoctorProfile>> {
    return { items: [], page: query.page, limit: query.limit, total: 0, totalPages: 0 };
  }

  async findPublicById(): Promise<PublicDoctorProfile | null> {
    return null;
  }

  async listSpecialties(): Promise<CatalogSpecialty[]> {
    return [];
  }

  async listHospitals(): Promise<CatalogHospital[]> {
    return [];
  }
}

describe("DoctorService", () => {
  it("does not submit an incomplete doctor profile", async () => {
    const incomplete = profile();
    incomplete.degrees = null;
    incomplete.specialties = [];
    incomplete.videoConsultationFee = null;
    const service = new DoctorService(new FakeDoctorRepository(incomplete));

    await expect(service.submitMyApplication(incomplete.userId)).rejects.toMatchObject({
      statusCode: 409,
      code: "DOCTOR_PROFILE_INCOMPLETE",
    });
  });

  it("submits a complete draft for admin review", async () => {
    const draft = profile();
    const service = new DoctorService(new FakeDoctorRepository(draft));

    const submitted = await service.submitMyApplication(draft.userId);

    expect(submitted.applicationStatus).toBe(DoctorApplicationStatus.PENDING_REVIEW);
  });

  it("blocks profile edits while an application is under review", async () => {
    const pending = profile(DoctorApplicationStatus.PENDING_REVIEW);
    const service = new DoctorService(new FakeDoctorRepository(pending));

    await expect(
      service.updateMyProfile(pending.userId, { bio: "Updated biography" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "APPLICATION_UNDER_REVIEW" });
  });

  it("returns an approved profile to draft after verified details change", async () => {
    const approved = profile(DoctorApplicationStatus.APPROVED);
    const repository = new FakeDoctorRepository(approved);
    const service = new DoctorService(repository);

    const updated = await service.updateMyProfile(approved.userId, {
      experienceYears: 6,
    });

    expect(repository.lastResetApproval).toBe(true);
    expect(updated.applicationStatus).toBe(DoctorApplicationStatus.DRAFT);
  });

  it("allows an admin to approve only a pending application", async () => {
    const pending = profile(DoctorApplicationStatus.PENDING_REVIEW);
    const repository = new FakeDoctorRepository(pending);
    const service = new DoctorService(repository);
    const adminId = randomUUID();

    const reviewed = await service.reviewApplication(adminId, pending.id, {
      decision: DoctorApplicationStatus.APPROVED,
    });

    expect(reviewed.applicationStatus).toBe(DoctorApplicationStatus.APPROVED);
    expect(reviewed.reviewedByUserId).toBe(adminId);

    await expect(
      service.reviewApplication(adminId, pending.id, {
        decision: DoctorApplicationStatus.REJECTED,
        reason: "Invalid credentials",
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: "APPLICATION_NOT_PENDING" });
  });
});
