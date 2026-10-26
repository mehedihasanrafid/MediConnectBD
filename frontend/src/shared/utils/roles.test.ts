import { describe, expect, it } from "vitest";
import type { PublicUser } from "../types";
import { defaultHomePathFor, hasAnyRole, hasRole, isAdmin, isDoctor, isPatient } from "./roles";

function makeUser(roles: string[]): PublicUser {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    status: "ACTIVE",
    roles,
    patientProfileId: null,
    doctorProfile: null,
  };
}

describe("role helpers", () => {
  it("checks individual and multiple roles safely when user is null or populated", () => {
    expect(hasRole(null, "PATIENT")).toBe(false);
    expect(hasAnyRole(undefined, ["PATIENT", "DOCTOR"])).toBe(false);

    const doctor = makeUser(["DOCTOR"]);
    expect(isDoctor(doctor)).toBe(true);
    expect(isPatient(doctor)).toBe(false);
    expect(isAdmin(doctor)).toBe(false);
    expect(hasAnyRole(doctor, ["PATIENT", "DOCTOR"])).toBe(true);
  });

  it("computes the default landing route for each role", () => {
    expect(defaultHomePathFor(null)).toBe("/doctors");
    expect(defaultHomePathFor(makeUser(["PATIENT"]))).toBe("/doctors");
    expect(defaultHomePathFor(makeUser(["DOCTOR"]))).toBe("/doctor");
    expect(defaultHomePathFor(makeUser(["ADMIN"]))).toBe("/admin/overview");
  });
});
