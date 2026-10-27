/**
 * Doctors, catalog, and scheduling domain API functions.
 */

import type {
  AvailabilityResponse,
  DoctorAppointment,
  DoctorEarningsSummary,
  DoctorListResponse,
  DoctorPatientHistory,
  Hospital,
  PublicDoctor,
  Specialty,
} from "../shared/types";
import { api } from "./client";

export const doctorsApi = {
  listPublic: (queryString: string) =>
    api.get<DoctorListResponse>(`/doctors${queryString ? `?${queryString}` : ""}`),
  getPublicProfile: (doctorId: string) => api.get<PublicDoctor>(`/doctors/${doctorId}`),
  getAvailability: (doctorId: string, days = 7, from?: string) => {
    const params = new URLSearchParams({ days: String(days) });
    if (from) params.set("from", from);
    return api.get<AvailabilityResponse>(`/doctors/${doctorId}/availability?${params.toString()}`);
  },
  getMyProfile: <T = unknown>() => api.get<T>("/doctors/me"),
  getMyEarnings: () => api.get<DoctorEarningsSummary>("/doctors/me/earnings"),
  getPatientHistory: (patientProfileId: string) =>
    api.get<DoctorPatientHistory>(`/doctors/me/patients/${patientProfileId}/history`),
  updateMyProfile: <T = unknown>(patch: unknown) => api.patch<T>("/doctors/me", patch),
  submitApplication: <T = unknown>() => api.post<T>("/doctors/me/submit"),
  listMyAppointments: () =>
    api.get<{ items: DoctorAppointment[] }>("/doctors/me/appointments"),
  getMySchedule: <T = unknown>() => api.get<T>("/doctors/me/schedule"),
  replaceMySchedule: <T = unknown>(rules: unknown) =>
    api.put<T>("/doctors/me/schedule", { rules }),
  addTimeOff: <T = unknown>(input: {
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
  }) => api.post<T>("/doctors/me/time-off", input),
  removeTimeOff: (timeOffId: string) => api.delete<void>(`/doctors/me/time-off/${timeOffId}`),
  generateSlots: () => api.post<{ generated: number }>("/doctors/me/slots/generate"),
  listSpecialties: () => api.get<{ items: Specialty[] }>("/catalog/specialties"),
  listHospitals: () => api.get<{ items: Hospital[] }>("/catalog/hospitals"),
};
