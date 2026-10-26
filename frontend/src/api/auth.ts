/**
 * Authentication domain API functions.
 */

import type { AuthResponse, PublicUser } from "../shared/types";
import { api, refreshSession } from "./client";

export interface RegisterPatientInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface RegisterDoctorInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bmdcNumber: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),
  registerPatient: (input: RegisterPatientInput) =>
    api.post<AuthResponse>("/auth/patient/register", input),
  registerDoctor: (input: RegisterDoctorInput) =>
    api.post<AuthResponse>("/auth/doctor/register", input),
  refresh: () => refreshSession(),
  logout: () => api.post<void>("/auth/logout"),
  getMe: () => api.get<PublicUser>("/me"),
};
