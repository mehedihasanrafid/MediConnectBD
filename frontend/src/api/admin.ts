/**
 * Admin operations and doctor application review domain API functions.
 */

import type { AdminOverview } from "../shared/types";
import { api } from "./client";

export const adminApi = {
  listDoctorApplications: <T = unknown>(status = "PENDING_REVIEW") =>
    api.get<{ items: T[] }>(`/admin/doctors/applications?status=${encodeURIComponent(status)}`),
  reviewDoctorApplication: <T = unknown>(
    doctorId: string,
    decision: "APPROVED" | "REJECTED",
    reason?: string,
  ) =>
    api.patch<T>(`/admin/doctors/${doctorId}/application`, {
      decision,
      ...(reason ? { reason } : {}),
    }),
  getOverview: () => api.get<AdminOverview>("/admin/overview"),
  listUsers: <T = unknown>(queryString = "") =>
    api.get<T>(`/admin/users${queryString ? `?${queryString}` : ""}`),
  updateUserStatus: <T = unknown>(userId: string, status: "ACTIVE" | "PENDING" | "SUSPENDED") =>
    api.patch<T>(`/admin/users/${userId}/status`, { status }),
  listSpecialties: <T = unknown>() => api.get<{ items: T[] }>("/admin/specialties"),
  createSpecialty: <T = unknown>(input: { name: string; slug: string }) =>
    api.post<T>("/admin/specialties", input),
  updateSpecialty: <T = unknown>(
    specialtyId: string,
    input: { name?: string; slug?: string; isActive?: boolean },
  ) => api.put<T>(`/admin/specialties/${specialtyId}`, input),
  deleteSpecialty: (specialtyId: string) =>
    api.delete<void>(`/admin/specialties/${specialtyId}`),
  listHospitals: <T = unknown>() => api.get<{ items: T[] }>("/admin/hospitals"),
  createHospital: <T = unknown>(input: {
    name: string;
    slug: string;
    area: string;
    address: string;
  }) => api.post<T>("/admin/hospitals", input),
  updateHospital: <T = unknown>(
    hospitalId: string,
    input: { name?: string; slug?: string; area?: string; address?: string; isActive?: boolean },
  ) => api.put<T>(`/admin/hospitals/${hospitalId}`, input),
  deleteHospital: (hospitalId: string) => api.delete<void>(`/admin/hospitals/${hospitalId}`),
  listAppointments: <T = unknown>(queryString = "") =>
    api.get<T>(`/admin/appointments${queryString ? `?${queryString}` : ""}`),
  listPayments: <T = unknown>(queryString = "") =>
    api.get<T>(`/admin/payments${queryString ? `?${queryString}` : ""}`),
  listRefunds: <T = unknown>(queryString = "") =>
    api.get<T>(`/admin/refunds${queryString ? `?${queryString}` : ""}`),
  submitRefund: <T = unknown>(refundId: string) =>
    api.post<T>(`/admin/refunds/${refundId}/submit`),
};
