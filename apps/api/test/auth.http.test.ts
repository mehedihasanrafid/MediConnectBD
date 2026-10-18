import { randomUUID } from "node:crypto";
import { Router } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import {
  requireRole,
  type AuthenticatedLocals,
} from "../src/common/middleware/authenticate";
import type { AuthUser } from "../src/modules/auth/auth.types";

const patient: AuthUser = {
  id: randomUUID(),
  email: "patient@example.com",
  firstName: "Test",
  lastName: "Patient",
  passwordHash: "not-exposed",
  status: "ACTIVE",
  roles: ["PATIENT"],
  patientProfileId: randomUUID(),
  doctorProfile: null,
};

function testApp(router: Router) {
  return createApp({
    appUrl: "http://localhost:5173",
    logLevel: "silent",
    readiness: {
      database: async () => undefined,
      redis: async () => undefined,
    },
    apiRouter: router,
  });
}

describe("authentication HTTP behavior", () => {
  it("returns structured validation errors", async () => {
    const router = Router();
    router.post("/validation", () => {
      const { z } = require("zod") as typeof import("zod");
      z.object({ email: z.string().email() }).parse({ email: "invalid" });
    });

    const response = await request(testApp(router)).post("/api/v1/validation");

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_FAILED");
    expect(response.body.fieldErrors[0].path).toBe("email");
  });

  it("blocks a patient from a doctor-only route", async () => {
    const router = Router();
    router.get(
      "/doctor-only",
      (_request, response, next) => {
        (response.locals as AuthenticatedLocals).authUser = patient;
        next();
      },
      requireRole("DOCTOR"),
      (_request, response) => response.status(200).json({ ok: true }),
    );

    const response = await request(testApp(router)).get("/api/v1/doctor-only");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ROLE_FORBIDDEN");
  });
});
