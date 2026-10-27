/**
 * Admin operational types: account management, catalog CRUD, reporting, and refund handling.
 */

import type { UserStatus } from "../users/user.entity";

export interface AdminUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
  createdAt: Date;
}

export interface AdminUsersQuery {
  status?: UserStatus | undefined;
  role?: string | undefined;
  search?: string | undefined;
  page: number;
  limit: number;
}

export interface AdminUsersPage {
  items: AdminUserView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type UpdateUserStatusResult =
  | { kind: "UPDATED"; user: AdminUserView }
  | { kind: "USER_NOT_FOUND" }
  | { kind: "SELF_SUSPENSION_FORBIDDEN" };

export interface SpecialtyView {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface HospitalView {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string;
  isActive: boolean;
}

export interface CreateSpecialtyInput {
  name: string;
  slug: string;
}

export interface UpdateSpecialtyInput {
  name?: string | undefined;
  slug?: string | undefined;
  isActive?: boolean | undefined;
}

export interface CreateHospitalInput {
  name: string;
  slug: string;
  area: string;
  address: string;
}

export interface UpdateHospitalInput {
  name?: string | undefined;
  slug?: string | undefined;
  area?: string | undefined;
  address?: string | undefined;
  isActive?: boolean | undefined;
}

export type CatalogWriteResult<T> =
  | { kind: "CREATED" | "UPDATED"; item: T }
  | { kind: "NOT_FOUND" }
  | { kind: "SLUG_CONFLICT" };

export type CatalogDeleteResult = { kind: "DELETED" } | { kind: "NOT_FOUND" };

export interface AdminTopSpecialty {
  specialtyId: string;
  name: string;
  slug: string;
  appointmentsCount: number;
}

export interface AdminTopDoctor {
  doctorId: string;
  firstName: string;
  lastName: string;
  bmdcNumber: string;
  appointmentsCount: number;
  completedCount: number;
}

export interface AdminOverview {
  users: { total: number; active: number; suspended: number; pending: number };
  doctors: { total: number; approved: number; pendingReview: number };
  patients: { newThisMonth: number };
  appointments: {
    total: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    today: number;
  };
  payments: { succeeded: number; grossAmount: string; commissionAmount: string; netAmount: string };
  refunds: { requested: number; totalAmount: string };
  mostBookedSpecialties: AdminTopSpecialty[];
  topDoctors: AdminTopDoctor[];
}

export interface AdminAppointmentQuery {
  status?: string | undefined;
  doctorId?: string | undefined;
  patientProfileId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
  limit: number;
}

export interface AdminAppointmentView {
  id: string;
  patientProfileId: string;
  doctorId: string;
  status: string;
  mode: string;
  scheduledStartAt: Date;
  feeAmount: string;
  createdAt: Date;
}

export interface AdminAppointmentsPage {
  items: AdminAppointmentView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminPaymentQuery {
  status?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
  limit: number;
}

export interface AdminPaymentView {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  transactionId: string;
  amount: string;
  currency: string;
  status: string;
  commissionAmount: string | null;
  netAmount: string | null;
  createdAt: Date;
}

export interface AdminPaymentsPage {
  items: AdminPaymentView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminRefundView {
  id: string;
  paymentId: string;
  refundTransactionId: string;
  amount: string;
  status: string;
  reason: string;
  providerReference: string | null;
  createdAt: Date;
}

export interface AdminRefundsPage {
  items: AdminRefundView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type SubmitRefundResult =
  | { kind: "SUBMITTED"; refund: AdminRefundView }
  | { kind: "REFUND_NOT_FOUND" }
  | { kind: "REFUND_NOT_REQUESTED" }
  | { kind: "PROVIDER_UNAVAILABLE" };
