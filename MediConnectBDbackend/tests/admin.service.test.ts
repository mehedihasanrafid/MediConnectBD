import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { AdminService } from "../src/modules/admin/admin.service";
import type { AdminRepository } from "../src/modules/admin/admin.repository";
import type {
  AdminAppointmentsPage,
  AdminOverview,
  AdminPaymentsPage,
  AdminRefundsPage,
  AdminUsersPage,
  CatalogDeleteResult,
  CatalogWriteResult,
  HospitalView,
  SpecialtyView,
  SubmitRefundResult,
  UpdateUserStatusResult,
} from "../src/modules/admin/admin.types";
import { UserStatus } from "../src/modules/users/user.entity";

const userId = randomUUID();
const actorId = randomUUID();
const specialtyId = randomUUID();
const hospitalId = randomUUID();
const refundId = randomUUID();

function specialty(): SpecialtyView {
  return { id: specialtyId, name: "Cardiology", slug: "cardiology", isActive: true };
}

function hospital(): HospitalView {
  return {
    id: hospitalId,
    name: "Dhaka Medical",
    slug: "dhaka-medical",
    area: "Bakshi Bazar",
    address: "Secretariat Road",
    isActive: true,
  };
}

class FakeAdminRepository implements AdminRepository {
  updateUserStatusResult: UpdateUserStatusResult = {
    kind: "UPDATED",
    user: {
      id: userId,
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
      status: UserStatus.SUSPENDED,
      roles: ["PATIENT"],
      createdAt: new Date(),
    },
  };
  createSpecialtyResult: CatalogWriteResult<SpecialtyView> = { kind: "CREATED", item: specialty() };
  updateSpecialtyResult: CatalogWriteResult<SpecialtyView> = { kind: "UPDATED", item: specialty() };
  deleteSpecialtyResult: CatalogDeleteResult = { kind: "DELETED" };
  createHospitalResult: CatalogWriteResult<HospitalView> = { kind: "CREATED", item: hospital() };
  updateHospitalResult: CatalogWriteResult<HospitalView> = { kind: "UPDATED", item: hospital() };
  deleteHospitalResult: CatalogDeleteResult = { kind: "DELETED" };
  submitRefundResult: SubmitRefundResult = {
    kind: "SUBMITTED",
    refund: {
      id: refundId,
      paymentId: randomUUID(),
      refundTransactionId: "RF123",
      amount: "400.00",
      status: "SUBMITTED",
      reason: "Patient cancelled",
      providerReference: null,
      createdAt: new Date(),
    },
  };

  async listUsers(): Promise<AdminUsersPage> {
    return { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
  }
  async updateUserStatus(): Promise<UpdateUserStatusResult> {
    return this.updateUserStatusResult;
  }
  async listSpecialties(): Promise<SpecialtyView[]> {
    return [specialty()];
  }
  async createSpecialty(): Promise<CatalogWriteResult<SpecialtyView>> {
    return this.createSpecialtyResult;
  }
  async updateSpecialty(): Promise<CatalogWriteResult<SpecialtyView>> {
    return this.updateSpecialtyResult;
  }
  async deleteSpecialty(): Promise<CatalogDeleteResult> {
    return this.deleteSpecialtyResult;
  }
  async listHospitals(): Promise<HospitalView[]> {
    return [hospital()];
  }
  async createHospital(): Promise<CatalogWriteResult<HospitalView>> {
    return this.createHospitalResult;
  }
  async updateHospital(): Promise<CatalogWriteResult<HospitalView>> {
    return this.updateHospitalResult;
  }
  async deleteHospital(): Promise<CatalogDeleteResult> {
    return this.deleteHospitalResult;
  }
  async getOverview(): Promise<AdminOverview> {
    return {
      users: { total: 0, active: 0, suspended: 0, pending: 0 },
      doctors: { total: 0, approved: 0, pendingReview: 0 },
      appointments: { total: 0, confirmed: 0, cancelled: 0, completed: 0 },
      payments: { succeeded: 0, grossAmount: "0.00", commissionAmount: "0.00", netAmount: "0.00" },
      refunds: { requested: 0, totalAmount: "0.00" },
    };
  }
  async listAppointments(): Promise<AdminAppointmentsPage> {
    return { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
  }
  async listPayments(): Promise<AdminPaymentsPage> {
    return { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
  }
  async listRefunds(): Promise<AdminRefundsPage> {
    return { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
  }
  async submitRefund(): Promise<SubmitRefundResult> {
    return this.submitRefundResult;
  }
  async findRefund() {
    return null;
  }
}

describe("AdminService", () => {
  let repo: FakeAdminRepository;
  let service: AdminService;

  beforeEach(() => {
    repo = new FakeAdminRepository();
    service = new AdminService(repo);
  });

  it("updates a user status", async () => {
    const user = await service.updateUserStatus(userId, UserStatus.SUSPENDED, actorId);
    expect(user.status).toBe(UserStatus.SUSPENDED);
  });

  it("rejects self suspension", async () => {
    repo.updateUserStatusResult = { kind: "SELF_SUSPENSION_FORBIDDEN" };
    await expect(
      service.updateUserStatus(actorId, UserStatus.SUSPENDED, actorId),
    ).rejects.toMatchObject({ statusCode: 409, code: "SELF_SUSPENSION_FORBIDDEN" });
  });

  it("returns USER_NOT_FOUND", async () => {
    repo.updateUserStatusResult = { kind: "USER_NOT_FOUND" };
    await expect(
      service.updateUserStatus(userId, UserStatus.ACTIVE, actorId),
    ).rejects.toMatchObject({ statusCode: 404, code: "USER_NOT_FOUND" });
  });

  it("creates a specialty", async () => {
    const item = await service.createSpecialty({ name: "Cardiology", slug: "cardiology" });
    expect(item.slug).toBe("cardiology");
  });

  it("rejects duplicate specialty slug", async () => {
    repo.createSpecialtyResult = { kind: "SLUG_CONFLICT" };
    await expect(
      service.createSpecialty({ name: "Cardiology", slug: "cardiology" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "SLUG_CONFLICT" });
  });

  it("returns SPECIALTY_NOT_FOUND on update", async () => {
    repo.updateSpecialtyResult = { kind: "NOT_FOUND" };
    await expect(service.updateSpecialty(specialtyId, { name: "X" })).rejects.toMatchObject({
      statusCode: 404,
      code: "SPECIALTY_NOT_FOUND",
    });
  });

  it("returns SPECIALTY_NOT_FOUND on delete", async () => {
    repo.deleteSpecialtyResult = { kind: "NOT_FOUND" };
    await expect(service.deleteSpecialty(specialtyId)).rejects.toMatchObject({
      statusCode: 404,
      code: "SPECIALTY_NOT_FOUND",
    });
  });

  it("creates a hospital", async () => {
    const item = await service.createHospital({
      name: "Dhaka Medical",
      slug: "dhaka-medical",
      area: "Bakshi Bazar",
      address: "Secretariat Road",
    });
    expect(item.slug).toBe("dhaka-medical");
  });

  it("rejects duplicate hospital slug", async () => {
    repo.createHospitalResult = { kind: "SLUG_CONFLICT" };
    await expect(
      service.createHospital({
        name: "Dhaka Medical",
        slug: "dhaka-medical",
        area: "Bakshi Bazar",
        address: "Secretariat Road",
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: "SLUG_CONFLICT" });
  });

  it("returns HOSPITAL_NOT_FOUND on update", async () => {
    repo.updateHospitalResult = { kind: "NOT_FOUND" };
    await expect(service.updateHospital(hospitalId, { name: "X" })).rejects.toMatchObject({
      statusCode: 404,
      code: "HOSPITAL_NOT_FOUND",
    });
  });

  it("submits a refund", async () => {
    const refund = await service.submitRefund(refundId);
    expect(refund.status).toBe("SUBMITTED");
  });

  it("returns REFUND_NOT_FOUND", async () => {
    repo.submitRefundResult = { kind: "REFUND_NOT_FOUND" };
    await expect(service.submitRefund(refundId)).rejects.toMatchObject({
      statusCode: 404,
      code: "REFUND_NOT_FOUND",
    });
  });

  it("returns REFUND_NOT_REQUESTED", async () => {
    repo.submitRefundResult = { kind: "REFUND_NOT_REQUESTED" };
    await expect(service.submitRefund(refundId)).rejects.toMatchObject({
      statusCode: 409,
      code: "REFUND_NOT_REQUESTED",
    });
  });

  it("returns overview totals", async () => {
    const overview = await service.getOverview();
    expect(overview.payments.grossAmount).toBe("0.00");
  });
});
