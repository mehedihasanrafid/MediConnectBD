/**
 * Admin service — maps repository result unions to stable API errors.
 */

import { AppError } from "../../utils/app-error";
import type { AdminRepository } from "./admin.repository";
import type {
  AdminAppointmentQuery,
  AdminPaymentQuery,
  AdminUsersQuery,
  CreateHospitalInput,
  CreateSpecialtyInput,
  UpdateHospitalInput,
  UpdateSpecialtyInput,
} from "./admin.types";
import type { UserStatus } from "../users/user.entity";

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  listUsers(query: AdminUsersQuery) {
    return this.repository.listUsers(query);
  }

  async updateUserStatus(userId: string, status: UserStatus, actorUserId: string) {
    const result = await this.repository.updateUserStatus(userId, status, actorUserId);
    if (result.kind === "USER_NOT_FOUND") {
      throw new AppError(404, "USER_NOT_FOUND", "User was not found");
    }
    if (result.kind === "SELF_SUSPENSION_FORBIDDEN") {
      throw new AppError(409, "SELF_SUSPENSION_FORBIDDEN", "You cannot suspend your own account");
    }
    return result.user;
  }

  listSpecialties() {
    return this.repository.listSpecialties();
  }

  async createSpecialty(input: CreateSpecialtyInput) {
    const result = await this.repository.createSpecialty(input);
    if (result.kind === "SLUG_CONFLICT") {
      throw new AppError(409, "SLUG_CONFLICT", "A specialty with this slug already exists");
    }
    if (result.kind === "NOT_FOUND") {
      throw new AppError(500, "UNEXPECTED_RESULT", "Unexpected create result");
    }
    return result.item;
  }

  async updateSpecialty(specialtyId: string, input: UpdateSpecialtyInput) {
    const result = await this.repository.updateSpecialty(specialtyId, input);
    if (result.kind === "NOT_FOUND") {
      throw new AppError(404, "SPECIALTY_NOT_FOUND", "Specialty was not found");
    }
    if (result.kind === "SLUG_CONFLICT") {
      throw new AppError(409, "SLUG_CONFLICT", "A specialty with this slug already exists");
    }
    return result.item;
  }

  async deleteSpecialty(specialtyId: string) {
    const result = await this.repository.deleteSpecialty(specialtyId);
    if (result.kind === "NOT_FOUND") {
      throw new AppError(404, "SPECIALTY_NOT_FOUND", "Specialty was not found");
    }
  }

  listHospitals() {
    return this.repository.listHospitals();
  }

  async createHospital(input: CreateHospitalInput) {
    const result = await this.repository.createHospital(input);
    if (result.kind === "SLUG_CONFLICT") {
      throw new AppError(409, "SLUG_CONFLICT", "A hospital with this slug already exists");
    }
    if (result.kind === "NOT_FOUND") {
      throw new AppError(500, "UNEXPECTED_RESULT", "Unexpected create result");
    }
    return result.item;
  }

  async updateHospital(hospitalId: string, input: UpdateHospitalInput) {
    const result = await this.repository.updateHospital(hospitalId, input);
    if (result.kind === "NOT_FOUND") {
      throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital was not found");
    }
    if (result.kind === "SLUG_CONFLICT") {
      throw new AppError(409, "SLUG_CONFLICT", "A hospital with this slug already exists");
    }
    return result.item;
  }

  async deleteHospital(hospitalId: string) {
    const result = await this.repository.deleteHospital(hospitalId);
    if (result.kind === "NOT_FOUND") {
      throw new AppError(404, "HOSPITAL_NOT_FOUND", "Hospital was not found");
    }
  }

  getOverview() {
    return this.repository.getOverview();
  }

  listAppointments(query: AdminAppointmentQuery) {
    return this.repository.listAppointments(query);
  }

  listPayments(query: AdminPaymentQuery) {
    return this.repository.listPayments(query);
  }

  listRefunds(page: number, limit: number) {
    return this.repository.listRefunds(page, limit);
  }

  async submitRefund(refundId: string) {
    const result = await this.repository.submitRefund(refundId);
    if (result.kind === "REFUND_NOT_FOUND") {
      throw new AppError(404, "REFUND_NOT_FOUND", "Refund was not found");
    }
    if (result.kind === "REFUND_NOT_REQUESTED") {
      throw new AppError(409, "REFUND_NOT_REQUESTED", "Only a REQUESTED refund can be submitted");
    }
    if (result.kind === "PROVIDER_UNAVAILABLE") {
      throw new AppError(503, "PROVIDER_UNAVAILABLE", "Refund provider is not configured");
    }
    return result.refund;
  }
}
