/**
 * Role helpers for UI visibility and navigation only.
 * These control UI visibility and navigation only. Backend authorization must still enforce permissions.
 */

import type { PublicUser } from "../types";

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export function hasRole(user: PublicUser | null | undefined, role: UserRole): boolean {
  if (!user) return false;
  return user.roles.includes(role);
}

export function hasAnyRole(user: PublicUser | null | undefined, roles: readonly string[]): boolean {
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

export function isPatient(user: PublicUser | null | undefined): boolean {
  return hasRole(user, "PATIENT");
}

export function isDoctor(user: PublicUser | null | undefined): boolean {
  return hasRole(user, "DOCTOR");
}

export function isAdmin(user: PublicUser | null | undefined): boolean {
  return hasRole(user, "ADMIN");
}

export function defaultHomePathFor(user: PublicUser | null | undefined): string {
  if (isAdmin(user)) return "/admin/overview";
  if (isDoctor(user)) return "/doctor";
  return "/doctors";
}
