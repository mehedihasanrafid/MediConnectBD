/**
 * Separates internal authenticated-user data from the public user view. AuthUser includes
 * passwordHash for credential verification; controllers must return PublicUser rather than
 * serialize an internal user directly.
 */

import type { DoctorApplicationStatus } from "../doctors/doctor-profile.entity";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  roles: string[];
  patientProfileId: string | null;
  doctorProfile: {
    id: string;
    applicationStatus: DoctorApplicationStatus;
  } | null;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: AuthUser["status"];
  roles: string[];
  patientProfileId: string | null;
  doctorProfile: AuthUser["doctorProfile"];
}

export interface SessionContext {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface PatientRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | undefined;
}

export interface DoctorRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bmdcNumber: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface NewRefreshSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export type RotationResult =
  | { kind: "ROTATED"; user: AuthUser; sessionId: string }
  | { kind: "INVALID" }
  | { kind: "EXPIRED" }
  | { kind: "REUSED" }
  | { kind: "BLOCKED" };

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: PublicUser;
}
