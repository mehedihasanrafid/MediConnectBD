import { describe, expect, it } from "vitest";
import type { User } from "../src/modules/users/user.entity";
import { canDirect, directKey, requireDirectMember } from "../src/modules/communication/direct/direct.policy";
import { effectiveCallStatus, nextCallStatus, requireCallMember } from "../src/modules/communication/calls/call.policy";

const account = (id: string, role: string, approved = true) => ({
  id, status: "ACTIVE", roles: [{ name: role }], doctorProfile: role === "DOCTOR" ? { applicationStatus: approved ? "APPROVED" : "DRAFT" } : null,
} as User);
describe("Direct conversation membership and role boundaries", () => {
  const doctor = account("a", "DOCTOR"), otherDoctor = account("b", "DOCTOR"), patient = account("c", "PATIENT");
  const admin = account("d", "ADMIN"), staff = account("e", "ADMIN");
  it("allows approved colleagues, support and staff while excluding patient-to-patient or arbitrary clinical contact", () => {
    expect(canDirect("COLLEAGUE", doctor, otherDoctor)).toBe(true);
    expect(canDirect("COLLEAGUE", doctor, patient)).toBe(false);
    expect(canDirect("COLLEAGUE", doctor, account("f", "DOCTOR", false))).toBe(false);
    expect(canDirect("SUPPORT", patient, admin)).toBe(true);
    expect(canDirect("SUPPORT", doctor, admin)).toBe(true);
    expect(canDirect("SUPPORT", patient, account("g", "PATIENT"))).toBe(false);
    expect(canDirect("STAFF", admin, staff)).toBe(true);
    expect(canDirect("STAFF", admin, doctor)).toBe(false);
  });
  it("blocks self conversations, suspended users and non-members even if they are admins", () => {
    expect(canDirect("COLLEAGUE", doctor, doctor)).toBe(false);
    expect(canDirect("SUPPORT", { ...patient, status: "SUSPENDED" } as User, admin)).toBe(false);
    expect(() => requireDirectMember({ memberAId: doctor.id, memberBId: otherDoctor.id } as any, admin)).toThrow("Only members");
  });
  it("deduplicates peer conversations independently of who starts them, and keeps support per requester", () => {
    expect(directKey("COLLEAGUE", "a", "b", "a")).toBe(directKey("COLLEAGUE", "b", "a", "b"));
    expect(directKey("SUPPORT", "a", "admin", "a")).toBe("SUPPORT:a");
  });
});
describe("Call lifecycle", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const ringing = { status: "RINGING" as const, callerId: "caller", calleeId: "callee", expiresAt: new Date(now.getTime() + 45000) };
  it("allows only the callee to accept or decline, the caller to cancel, and either member to end an accepted call", () => {
    expect(nextCallStatus(ringing, "callee", "accept", now)).toBe("ACCEPTED");
    expect(nextCallStatus(ringing, "callee", "decline", now)).toBe("DECLINED");
    expect(nextCallStatus(ringing, "caller", "cancel", now)).toBe("CANCELLED");
    expect(() => nextCallStatus(ringing, "caller", "accept", now)).toThrow("changed or expired");
    expect(() => nextCallStatus(ringing, "callee", "cancel", now)).toThrow("changed or expired");
    expect(nextCallStatus({ ...ringing, status: "ACCEPTED" }, "caller", "end", now)).toBe("ENDED");
    expect(nextCallStatus({ ...ringing, status: "ACCEPTED" }, "callee", "end", now)).toBe("ENDED");
  });
  it("expires unanswered calls as missed and prevents late acceptance", () => {
    const expired = { ...ringing, expiresAt: now };
    expect(effectiveCallStatus(expired, now)).toBe("MISSED");
    expect(() => nextCallStatus(expired, "callee", "accept", now)).toThrow("changed or expired");
    expect(effectiveCallStatus({ ...expired, status: "ACCEPTED" }, now)).toBe("ENDED");
  });
  it("blocks outsiders and makes terminal actions idempotent", () => {
    expect(() => requireCallMember(ringing, "admin")).toThrow("Only call participants");
    expect(() => nextCallStatus(ringing, "admin", "decline", now)).toThrow("Only call participants");
    expect(nextCallStatus({ ...ringing, status: "DECLINED" }, "callee", "decline", now)).toBe("DECLINED");
    expect(() => nextCallStatus({ ...ringing, status: "DECLINED" }, "caller", "accept", now)).toThrow("changed or expired");
  });
});
