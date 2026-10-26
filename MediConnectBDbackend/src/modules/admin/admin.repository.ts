/**
 * Persistence contract for admin operations. Result unions keep MySQL errors out of services.
 */

import type {
  AdminAppointmentQuery,
  AdminAppointmentsPage,
  AdminOverview,
  AdminPaymentQuery,
  AdminPaymentsPage,
  AdminRefundView,
  AdminRefundsPage,
  AdminUsersPage,
  AdminUsersQuery,
  CatalogDeleteResult,
  CatalogWriteResult,
  CreateHospitalInput,
  CreateSpecialtyInput,
  HospitalView,
  SpecialtyView,
  SubmitRefundResult,
  UpdateHospitalInput,
  UpdateSpecialtyInput,
  UpdateUserStatusResult,
} from "./admin.types";
import type { UserStatus } from "../users/user.entity";

export interface AdminRepository {
  listUsers(query: AdminUsersQuery): Promise<AdminUsersPage>;
  updateUserStatus(
    userId: string,
    status: UserStatus,
    actorUserId: string,
  ): Promise<UpdateUserStatusResult>;

  listSpecialties(): Promise<SpecialtyView[]>;
  createSpecialty(input: CreateSpecialtyInput): Promise<CatalogWriteResult<SpecialtyView>>;
  updateSpecialty(
    specialtyId: string,
    input: UpdateSpecialtyInput,
  ): Promise<CatalogWriteResult<SpecialtyView>>;
  deleteSpecialty(specialtyId: string): Promise<CatalogDeleteResult>;

  listHospitals(): Promise<HospitalView[]>;
  createHospital(input: CreateHospitalInput): Promise<CatalogWriteResult<HospitalView>>;
  updateHospital(
    hospitalId: string,
    input: UpdateHospitalInput,
  ): Promise<CatalogWriteResult<HospitalView>>;
  deleteHospital(hospitalId: string): Promise<CatalogDeleteResult>;

  getOverview(): Promise<AdminOverview>;
  listAppointments(query: AdminAppointmentQuery): Promise<AdminAppointmentsPage>;
  listPayments(query: AdminPaymentQuery): Promise<AdminPaymentsPage>;
  listRefunds(page: number, limit: number): Promise<AdminRefundsPage>;
  submitRefund(refundId: string): Promise<SubmitRefundResult>;
  findRefund(refundId: string): Promise<AdminRefundView | null>;
}
