import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DoctorApplicationStatus } from "../src/modules/doctors/doctor-profile.entity";
import type { DoctorRepository } from "../src/modules/doctors/doctor.repository";
import { DoctorService } from "../src/modules/doctors/doctor.service";
import type {
  CatalogHospital,
  CatalogSpecialty,
  DoctorApplicationQuery,
  DoctorEarningsSummary,
  DoctorPatientHistoryResult,
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
  historyResult: DoctorPatientHistoryResult = {
    kind: "OK",
    history: {
      patient: {
        id: randomUUID(),
        firstName: "Amina",
        lastName: "Begum",
        email: "amina@example.com",
        phone: "01700000000",
        dateOfBirth: "1990-01-01",
        sex: "FEMALE",
      },
      visits: [],
      prescriptions: [],
      reports: [],
    },
  };

  constructor(current: DoctorProfileDetails | null) {
    this.current = current;
  }

  async findByUserId(): Promise<DoctorProfileDetails | null> {
    return this.current;
  }

  async getPatientHistory(): Promise<DoctorPatientHistoryResult> {
    return this.historyResult;
  }

  async getEarnings(): Promise<DoctorEarningsSummary> {
    return {
      totals: {
        succeededPayments: 2,
        completedConsultations: 2,
        grossAmount: "2000.00",
        commissionAmount: "200.00",
        netAmount: "1800.00",
      },
      byDay: [
        {
          period: "2026-10-26",
          appointmentsCount: 2,
          grossAmount: "2000.00",
          commissionAmount: "200.00",
          netAmount: "1800.00",
        },
      ],
      byMonth: [
        {
          period: "2026-10",
          appointmentsCount: 2,
          grossAmount: "2000.00",
          commissionAmount: "200.00",
          netAmount: "1800.00",
        },
      ],
    };
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

  it("returns doctor earnings summary by day and month", async () => {
    const approved = profile(DoctorApplicationStatus.APPROVED);
    const service = new DoctorService(new FakeDoctorRepository(approved));

    const earnings = await service.getMyEarnings(approved.userId);
    expect(earnings.totals.commissionAmount).toBe("200.00");
    expect(earnings.totals.netAmount).toBe("1800.00");
    expect(earnings.byDay).toHaveLength(1);
    expect(earnings.byMonth).toHaveLength(1);
  });

  it("returns patient clinical history for treating doctors and blocks non-treating doctors", async () => {
    const approved = profile(DoctorApplicationStatus.APPROVED);
    const repo = new FakeDoctorRepository(approved);
    const service = new DoctorService(repo);
    const patientId = randomUUID();

    const history = await service.getPatientHistory(approved.userId, patientId);
    expect(history.patient.email).toBe("amina@example.com");

    repo.historyResult = { kind: "DOCTOR_FORBIDDEN" };
    await expect(service.getPatientHistory(approved.userId, patientId)).rejects.toMatchObject({
      statusCode: 403,
      code: "DOCTOR_PATIENT_RELATIONSHIP_REQUIRED",
    });
  });
});
