import { randomUUID } from "node:crypto";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { createDoctorRouter, createAdminDoctorRouter, createCatalogRouter } from "../src/modules/doctors/doctor.routes";
import type { DoctorService } from "../src/modules/doctors/doctor.service";
import type { SchedulingService } from "../src/modules/scheduling/scheduling.service";
import { createUserRouter } from "../src/modules/users/user.routes";
import { createAuthRouter } from "../src/modules/auth/auth.routes";
import type { AuthService } from "../src/modules/auth/auth.service";
import { createReviewRouter } from "../src/modules/reviews/review.routes";
import type { ReviewService } from "../src/modules/reviews/review.service";
import { createPrescriptionRouter } from "../src/modules/prescriptions/prescription.routes";
import type { PrescriptionService } from "../src/modules/prescriptions/prescription.service";

const userId = randomUUID();
const doctorId = randomUUID();
const timeOffId = randomUUID();

function fixture(role = "DOCTOR") {
  const doctor = Object.fromEntries(["listPublic", "getMyProfile", "updateMyProfile", "submitMyApplication", "getPublicProfile", "listApplications", "reviewApplication", "listSpecialties", "listHospitals"]
    .map(name => [name, vi.fn().mockResolvedValue({ ok: true })]));
  const scheduling = Object.fromEntries(["getMySchedule", "replaceMySchedule", "addMyTimeOff", "removeMyTimeOff", "regenerateMySlots", "getPublicAvailability"]
    .map(name => [name, vi.fn().mockResolvedValue({ ok: true })]));
  const authenticate: RequestHandler = (_req, res, next) => {
    res.locals.authUser = { id: userId, email: "synthetic@example.com", firstName: "Test", lastName: "User", status: "ACTIVE", roles: [role], patientProfileId: null, doctorProfile: null, passwordHash: "must-not-be-exposed" };
    next();
  };
  const options = { doctorService: doctor as unknown as DoctorService, schedulingService: scheduling as unknown as SchedulingService, authenticate };
  const router = Router();
  router.use("/doctors", createDoctorRouter(options));
  router.use("/admin/doctors", createAdminDoctorRouter(options));
  router.use("/catalog", createCatalogRouter(options.doctorService));
  router.use(createUserRouter(authenticate));
  const app = createApp({ appUrl: "http://localhost:5173", logLevel: "silent", apiRouter: router,
    readiness: { database: async () => undefined, redis: async () => undefined } });
  return { app, doctor, scheduling };
}

describe("routes after the DokanBD-style reorganization", () => {
  it.each([
    ["get", "/doctors", "listPublic", "doctor", undefined, 200],
    ["get", "/doctors/me", "getMyProfile", "doctor", undefined, 200],
    ["patch", "/doctors/me", "updateMyProfile", "doctor", { degrees: "MBBS" }, 200],
    ["post", "/doctors/me/submit", "submitMyApplication", "doctor", undefined, 200],
    ["get", "/doctors/me/schedule", "getMySchedule", "scheduling", undefined, 200],
    ["put", "/doctors/me/schedule", "replaceMySchedule", "scheduling", { rules: [] }, 200],
    ["post", "/doctors/me/time-off", "addMyTimeOff", "scheduling", { date: "2026-10-25" }, 201],
    ["delete", `/doctors/me/time-off/${timeOffId}`, "removeMyTimeOff", "scheduling", undefined, 204],
    ["post", "/doctors/me/slots/generate", "regenerateMySlots", "scheduling", undefined, 200],
    ["get", `/doctors/${doctorId}/availability`, "getPublicAvailability", "scheduling", undefined, 200],
    ["get", `/doctors/${doctorId}`, "getPublicProfile", "doctor", undefined, 200],
    ["get", "/catalog/specialties", "listSpecialties", "doctor", undefined, 200],
    ["get", "/catalog/hospitals", "listHospitals", "doctor", undefined, 200],
  ] as const)("%s %s reaches the correct controller and service", async (method, url, name, group, body, status) => {
    const f = fixture();
    const call = request(f.app)[method](`/api/v1${url}`);
    const response = await (body ? call.send(body) : call);
    expect(response.status).toBe(status);
    expect(f[group][name]).toHaveBeenCalledTimes(1);
  });

  it("keeps scheduling routes protected after moving them into their own module", async () => {
    const f = fixture("PATIENT");
    expect((await request(f.app).get("/api/v1/doctors/me/schedule")).status).toBe(403);
    expect(f.scheduling.getMySchedule).not.toHaveBeenCalled();
  });

  it("keeps admin review handlers separate and protected", async () => {
    const f = fixture("ADMIN");
    expect((await request(f.app).get("/api/v1/admin/doctors/applications")).status).toBe(200);
    expect((await request(f.app).patch(`/api/v1/admin/doctors/${doctorId}/application`).send({ decision: "APPROVED" })).status).toBe(200);
    expect(f.doctor.reviewApplication).toHaveBeenCalledWith(userId, doctorId, { decision: "APPROVED" });
    expect((await request(fixture("PATIENT").app).get("/api/v1/admin/doctors/applications")).status).toBe(403);
  });

  it("preserves the /me response without exposing the password hash", async () => {
    const response = await request(fixture().app).get("/api/v1/me");
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(userId);
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("preserves registration responses and the HTTP-only refresh cookie", async () => {
    const result = { accessToken: "access", accessTokenExpiresIn: 900, refreshToken: "private-refresh",
      refreshTokenExpiresAt: new Date(Date.now() + 86400000), user: { id: userId } };
    const registerPatient = vi.fn().mockResolvedValue(result);
    const router = Router();
    router.use("/auth", createAuthRouter({ authService: { registerPatient } as unknown as AuthService, secureCookies: false }));
    const app = createApp({ appUrl: "http://localhost:5173", logLevel: "silent", apiRouter: router, readiness: { database: async () => undefined, redis: async () => undefined } });
    const response = await request(app).post("/api/v1/auth/patient/register").send({ email: "patient@example.com", password: "TestPassword123", firstName: "Test", lastName: "Patient" });
    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBe("access");
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(registerPatient).toHaveBeenCalledTimes(1);
  });

  it("allows public, patient, and admin access on review and prescription routes without role conflicts", async () => {
    const reviewService = {
      createReview: vi.fn().mockResolvedValue({ ok: true }),
      getPatientReviews: vi.fn().mockResolvedValue([]),
      getDoctorReviews: vi.fn().mockResolvedValue([]),
      deleteReview: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as ReviewService;
    const prescriptionService = {
      createPrescription: vi.fn().mockResolvedValue({ ok: true }),
      getPatientPrescriptions: vi.fn().mockResolvedValue([]),
      getDoctorPrescriptions: vi.fn().mockResolvedValue([]),
      updatePrescription: vi.fn().mockResolvedValue({ ok: true }),
      deletePrescription: vi.fn().mockResolvedValue({ success: true }),
      verifyByCode: vi.fn().mockResolvedValue({ valid: true, prescription: null }),
    } as unknown as PrescriptionService;

    let currentRole: string | null = null;
    const authenticate: RequestHandler = (_req, res, next) => {
      if (!currentRole) {
        res.status(401).json({ code: "AUTHENTICATION_REQUIRED" });
        return;
      }
      res.locals.authUser = {
        id: userId,
        email: "synthetic@example.com",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE",
        roles: [currentRole],
        patientProfileId: currentRole === "PATIENT" ? randomUUID() : null,
        doctorProfile: currentRole === "DOCTOR" ? { id: doctorId, applicationStatus: "APPROVED" } : null,
        passwordHash: "hidden",
      };
      next();
    };

    const router = Router();
    router.use("/reviews", createReviewRouter({ reviewService, authenticate }));
    router.use("/prescriptions", createPrescriptionRouter({ prescriptionService, authenticate }));
    const app = createApp({
      appUrl: "http://localhost:5173",
      logLevel: "silent",
      apiRouter: router,
      readiness: { database: async () => undefined, redis: async () => undefined },
    });

    // Public endpoints work with no auth token
    currentRole = null;
    expect((await request(app).get(`/api/v1/reviews/doctors/${doctorId}/reviews`)).status).toBe(200);
    expect((await request(app).get("/api/v1/prescriptions/verify/ABCDEF1234567890")).status).toBe(200);

    // Patient endpoint works for PATIENT role
    currentRole = "PATIENT";
    expect((await request(app).get("/api/v1/prescriptions/patients/me/prescriptions")).status).toBe(200);

    // Admin endpoint works for ADMIN role
    currentRole = "ADMIN";
    expect((await request(app).delete(`/api/v1/reviews/${randomUUID()}`)).status).toBe(204);
  });
});
