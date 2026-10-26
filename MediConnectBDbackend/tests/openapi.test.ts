import SwaggerParser from "@apidevtools/swagger-parser";
import type { RequestHandler, Router } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { openApiDocument } from "../src/docs/openapi";
import { requestExamples } from "../src/docs/openapi.schemas";
import { createHealthRouter } from "../src/modules/health/health.routes";
import { createAuthRouter } from "../src/modules/auth/auth.routes";
import { createDoctorRouter, createAdminDoctorRouter, createCatalogRouter } from "../src/modules/doctors/doctor.routes";
import { createAppointmentRouter } from "../src/modules/appointments/appointment.routes";
import { createPaymentRouter } from "../src/modules/payments/payment.routes";
import { createUserRouter } from "../src/modules/users/user.routes";
import type { AuthService } from "../src/modules/auth/auth.service";
import type { DoctorService } from "../src/modules/doctors/doctor.service";
import type { SchedulingService } from "../src/modules/scheduling/scheduling.service";
import type { AppointmentService } from "../src/modules/appointments/appointment.service";
import type { PaymentService } from "../src/modules/payments/payment.service";
import { patientRegistrationSchema, doctorRegistrationSchema, loginSchema } from "../src/modules/auth/auth.schema";
import { updateDoctorProfileSchema, doctorReviewSchema } from "../src/modules/doctors/doctor.schema";
import { createTimeOffSchema, replaceScheduleSchema } from "../src/modules/scheduling/scheduling.schema";
import { createHoldSchema, bookAppointmentSchema } from "../src/modules/appointments/appointment.schema";
import { paymentCustomerSchema, paymentCallbackSchema } from "../src/modules/payments/payment.schema";
import { createReviewRouter } from "../src/modules/reviews/review.routes";
import type { ReviewService } from "../src/modules/reviews/review.service";

type Layer = { route?: { path: string | string[]; methods: Record<string, boolean> }; handle?: { stack?: Layer[] } };
const methods = ["get", "post", "put", "patch", "delete"] as const;

/** Inspect actual bindings without executing handlers or connecting infrastructure. */
function collect(router: Router, prefix: string): string[] {
  const routes: string[] = [];
  function walk(layers: Layer[]) {
    for (const layer of layers) {
      if (layer.route) {
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const path of paths) for (const method of methods) if (layer.route.methods[method]) {
          const fullPath = (prefix + (path === "/" ? "" : path)).replace(/:([A-Za-z0-9_]+)/g, "{$1}");
          routes.push(`${method.toUpperCase()} ${fullPath || "/"}`);
        }
      } else if (layer.handle?.stack) walk(layer.handle.stack);
    }
  }
  walk(router.stack as Layer[]);
  return routes;
}

function testApp() {
  const database = vi.fn(async () => undefined);
  const redis = vi.fn(async () => undefined);
  return { app: createApp({ appUrl: "http://localhost:5173", logLevel: "silent", readiness: { database, redis } }), database, redis };
}

describe("OpenAPI and Swagger", () => {
  it("is a valid OpenAPI document with resolvable local references", async () => {
    await expect(SwaggerParser.validate(structuredClone(openApiDocument), { resolve: { external: false } })).resolves.toMatchObject({ openapi: "3.0.3" });
  });

  it("documents every implemented method/path exactly once", () => {
    const authenticate: RequestHandler = (_req, _res, next) => next();
    const authService = {} as AuthService;
    const doctorService = {} as DoctorService;
    const schedulingService = {} as SchedulingService;
    const appointmentService = {} as AppointmentService;
    const paymentService = {} as PaymentService;
    const reviewService = {} as ReviewService;
    const doctorOptions = { doctorService, schedulingService, authenticate };
    const actual = ["GET /",
      ...collect(createHealthRouter({ database: async () => undefined, redis: async () => undefined }), "/health"),
      ...collect(createAuthRouter({ authService, secureCookies: false }), "/api/v1/auth"),
      ...collect(createDoctorRouter(doctorOptions), "/api/v1/doctors"),
      ...collect(createAdminDoctorRouter(doctorOptions), "/api/v1/admin/doctors"),
      ...collect(createCatalogRouter(doctorService), "/api/v1/catalog"),
      ...collect(createAppointmentRouter({ appointmentService, authenticate }), "/api/v1/appointments"),
      ...collect(createPaymentRouter(paymentService, authenticate), "/api/v1"),
      ...collect(createUserRouter(authenticate), "/api/v1"),
      ...collect(createReviewRouter({ reviewService, authenticate }), "/reviews"),
    ];
    const documented = Object.entries(openApiDocument.paths).flatMap(([path, item]) => methods.filter(method => item?.[method]).map(method => `${method.toUpperCase()} ${path}`));
    expect(documented.sort()).toEqual(actual.sort());
    const ids = Object.values(openApiDocument.paths).flatMap(item => methods.flatMap(method => item?.[method]?.operationId ? [item[method]!.operationId] : []));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    ["PatientRegistration", patientRegistrationSchema], ["DoctorRegistration", doctorRegistrationSchema], ["Login", loginSchema],
    ["DoctorProfilePatch", updateDoctorProfileSchema], ["DoctorReview", doctorReviewSchema], ["ReplaceSchedule", replaceScheduleSchema],
    ["CreateTimeOff", createTimeOffSchema], ["CreateHold", createHoldSchema], ["BookAppointment", bookAppointmentSchema],
    ["PaymentCustomer", paymentCustomerSchema], ["PaymentCallback", paymentCallbackSchema],
  ] as const)("keeps the %s example valid against the real Zod request schema", (name, schema) => {
    expect(schema.safeParse(requestExamples[name]).success).toBe(true);
  });

  it("keeps public, bearer, and refresh-cookie security distinct", () => {
    expect(openApiDocument.paths["/api/v1/doctors"]!.get!.security).toEqual([]);
    expect(openApiDocument.paths["/api/v1/payments/sslcommerz/ipn"]!.post!.security).toEqual([]);
    expect(openApiDocument.paths["/api/v1/appointments"]!.post!.security).toEqual([{ bearerAuth: [] }]);
    expect(openApiDocument.paths["/api/v1/auth/refresh"]!.post!.security).toEqual([{ refreshCookie: [] }]);
    expect(openApiDocument.paths["/api/v1/admin/doctors/applications"]!.get).toHaveProperty("x-required-roles", ["ADMIN"]);
  });

  it("requires the payment idempotency header and documents form callbacks", () => {
    const operation = openApiDocument.paths["/api/v1/appointments/{appointmentId}/payments"]!.post!;
    expect(operation.parameters).toContainEqual(expect.objectContaining({ name: "Idempotency-Key", in: "header", required: true }));
    expect(openApiDocument.paths["/api/v1/payments/sslcommerz/ipn"]!.post!.requestBody).toHaveProperty("content.application/x-www-form-urlencoded");
  });

  it("serves both JSON endpoints without running database or Redis readiness checks", async () => {
    const f = testApp();
    for (const url of ["/openapi.json", "/api-docs.json"]) {
      const response = await request(f.app).get(url);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(JSON.stringify(openApiDocument)));
      expect(response.headers["cache-control"]).toBe("no-store");
    }
    expect(f.database).not.toHaveBeenCalled();
    expect(f.redis).not.toHaveBeenCalled();
  });

  it("serves Swagger HTML, initialization, JavaScript, and CSS locally", async () => {
    const { app } = testApp();
    const html = await request(app).get("/api-docs/");
    expect(html.status).toBe(200);
    expect(html.text).toContain("MediConnect BD API testing");
    expect(html.text).toContain("swagger-ui-bundle.js");
    const script = await request(app).get("/api-docs/swagger-ui-init.js");
    expect(script.text).toContain("/openapi.json");
    expect(script.text).toMatch(/"persistAuthorization"\s*:\s*false/);
    expect(script.text).toMatch(/"validatorUrl"\s*:\s*null/);
    expect((await request(app).get("/api-docs/swagger-ui-bundle.js")).status).toBe(200);
    expect((await request(app).get("/api-docs/swagger-ui.css")).status).toBe(200);
  });

  it("limits the local-HTTP CSP adjustment to Swagger while preserving API headers", async () => {
    const { app } = testApp();
    const docs = await request(app).get("/api-docs/");
    const health = await request(app).get("/health/live");
    expect(docs.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(docs.headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
    expect(health.headers["content-security-policy"]).toContain("upgrade-insecure-requests");
    expect(health.headers["x-content-type-options"]).toBe("nosniff");
  });
});
