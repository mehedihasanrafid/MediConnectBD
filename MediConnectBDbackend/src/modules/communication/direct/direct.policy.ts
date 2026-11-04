import { AppError } from "../../../utils/app-error";
import type { User } from "../../users/user.entity";
import type { DirectConversation, DirectKind } from "./direct.entities";

export interface DirectActor { id: string; roles: string[] }
export const rolesOf = (user: User) => user.roles.map((role) => role.name);
export function roleOf(user: User): "ADMIN" | "DOCTOR" | "PATIENT" {
  const roles = rolesOf(user);
  return roles.includes("ADMIN") ? "ADMIN" : roles.includes("DOCTOR") ? "DOCTOR" : "PATIENT";
}
export function approvedDoctor(user: User): boolean {
  return user.status === "ACTIVE" && rolesOf(user).includes("DOCTOR") && user.doctorProfile?.applicationStatus === "APPROVED";
}
export function canDirect(kind: DirectKind, a: User, b: User): boolean {
  if (a.id === b.id || a.status !== "ACTIVE" || b.status !== "ACTIVE") return false;
  if (kind === "COLLEAGUE") return approvedDoctor(a) && approvedDoctor(b);
  if (kind === "STAFF") return rolesOf(a).includes("ADMIN") && rolesOf(b).includes("ADMIN");
  if (kind !== "SUPPORT") return false;
  const admin = (user: User) => rolesOf(user).includes("ADMIN");
  const requester = (user: User) => rolesOf(user).some((role) => role === "DOCTOR" || role === "PATIENT");
  return admin(a) && requester(b) && !admin(b) || admin(b) && requester(a) && !admin(a);
}
export function requireDirectMember(conversation: DirectConversation, actor: DirectActor) {
  if (conversation.memberAId !== actor.id && conversation.memberBId !== actor.id) {
    throw new AppError(403, "DIRECT_CONVERSATION_FORBIDDEN", "Only members can access this conversation");
  }
}
export function directKey(kind: DirectKind, a: string, b: string, requester: string) {
  return kind === "SUPPORT" ? `SUPPORT:${requester}` : `${kind}:${[a, b].sort().join(":")}`;
}
