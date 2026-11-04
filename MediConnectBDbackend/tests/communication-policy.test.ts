import { describe, expect, it } from "vitest";
import { authorizeConversation, communicationCapabilities } from "../src/modules/communication/communication-policy";
const now = new Date("2026-11-03T12:00:00Z");
const conv = () => ({ status: "ACTIVE", patientProfileId: "p", doctorProfileId: "d", familyMemberId: null,
  patientProfile: { user: { id: "pu" } }, doctorProfile: { user: { id: "du" } },
  appointment: { status: "COMPLETED", patientProfileId: "p", doctorProfileId: "d", familyMemberId: null,
    mode: "VIDEO", scheduledStartAt: new Date("2026-11-01"), scheduledEndAt: new Date("2026-11-01"), completedAt: new Date("2026-11-01") },
  entitlement: { isExtended: false, windowExpiresAt: new Date("2099-01-01") } });
describe("communication retention and entitlement policy", () => {
  it("ignores mutable appointment/entitlement timestamps for standard follow-up", () => {
    const c = conv(); c.appointment.completedAt = new Date("2026-10-01");
    expect(communicationCapabilities(c, now).canSend).toBe(false);
  });
  it.each(["CANCELLED", "NO_SHOW", "PENDING_PAYMENT", "PAYMENT_EXPIRED"])("does not grant sending from %s", status => {
    const c = conv(); c.appointment.status = status;
    expect(communicationCapabilities(c, now).canSend).toBe(false);
  });
  it("rejects forged user identity even with the correct profile ID", () => {
    expect(() => authorizeConversation(conv(), { userId: "stranger", userRole: "PATIENT", patientProfileId: "p" })).toThrow();
  });
  it("accepts the owning patient and assigned doctor", () => {
    expect(() => authorizeConversation(conv(), { userId: "pu", userRole: "PATIENT", patientProfileId: "p" })).not.toThrow();
    expect(() => authorizeConversation(conv(), { userId: "du", userRole: "DOCTOR", doctorProfileId: "d" })).not.toThrow();
  });
  it("rejects mismatched beneficiaries and appointment ownership", () => {
    const c: any = conv(); c.familyMemberId = "f"; c.appointment.familyMemberId = "f";
    c.familyMember = { patientProfileId: "other" };
    expect(() => authorizeConversation(c, { userId: "pu", userRole: "PATIENT", patientProfileId: "p" })).toThrow();
  });
  it("expires exactly at the deadline and denies missing entitlements", () => {
    const c: any = conv(); c.appointment.completedAt = new Date(now.getTime() - 7 * 86400000);
    expect(communicationCapabilities(c, now).canSend).toBe(false);
    c.entitlement = null; expect(communicationCapabilities(c, now).canSend).toBe(false);
  });
});
