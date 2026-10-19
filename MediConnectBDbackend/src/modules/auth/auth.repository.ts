/**
 * Persistence port consumed by AuthService. Implementations own atomic account/profile creation
 * and refresh-token rotation; business code receives result unions instead of driver-specific
 * exceptions.
 */

import type {
  AuthUser,
  DoctorRegistration,
  NewRefreshSession,
  PatientRegistration,
  RotationResult,
} from "./auth.types";

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createPatient(input: PatientRegistration, passwordHash: string): Promise<AuthUser>;
  createDoctor(input: DoctorRegistration, passwordHash: string): Promise<AuthUser>;
  createRefreshSession(input: NewRefreshSession): Promise<string>;
  rotateRefreshSession(
    currentTokenHash: string,
    replacement: Omit<NewRefreshSession, "userId">,
    now: Date,
  ): Promise<RotationResult>;
  revokeRefreshSession(tokenHash: string, now: Date): Promise<void>;
}
