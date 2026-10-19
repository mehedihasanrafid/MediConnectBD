import { randomUUID } from "node:crypto";
import { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { AppError } from "../src/utils/app-error";
import { createPaymentRouter } from "../src/modules/payments/payment.routes";
import { PaymentService } from "../src/modules/payments/payment.service";
import type { PaymentRepository } from "../src/modules/payments/payment.repository";

function fixture(role = "PATIENT") {
  const patientId = randomUUID();
  const payment = { id: randomUUID(), appointmentId: randomUUID(), patientProfileId: patientId, transactionId: "MCtest", amount: "800.00", currency: "BDT", status: "PENDING", expiresAt: new Date() };
  const repository = { findByTransaction: vi.fn().mockResolvedValue(payment), applyVerified: vi.fn().mockResolvedValue(payment) } as unknown as PaymentRepository;
  const provider = { initiate: vi.fn(), verify: vi.fn().mockResolvedValue({ transactionId: "MCtest", amount: "800", currency: "BDT", status: "VALID", validationId: "validation", bankTransactionId: "bank", riskLevel: "0" }) };
  const authenticate: RequestHandler = (req, res, next) => {
    if (!req.header("authorization")) throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
    res.locals.authUser = { roles: [role], patientProfileId: patientId };
    next();
  };
  const app = createApp({ appUrl: "http://localhost:5173", logLevel: "silent", readiness: { database: async () => undefined, redis: async () => undefined },
    apiRouter: createPaymentRouter(new PaymentService(repository, provider), authenticate) });
  return { app, payment, provider, repository };
}

describe("payment HTTP boundary", () => {
  it("accepts provider form callbacks without patient cookies and verifies them", async () => {
    const f = fixture();
    const response = await request(f.app).post("/api/v1/payments/sslcommerz/ipn").type("form")
      .send({ tran_id: "MCtest", val_id: "validation", status: "FORGED_CLIENT_STATUS", card_no: "must-not-be-saved" });
    expect(response.status).toBe(200);
    expect(f.provider.verify).toHaveBeenCalledWith("MCtest", "validation");
    expect(response.body).toEqual({ received: true, status: "PENDING" });
    expect(JSON.stringify(vi.mocked(f.repository.applyVerified).mock.calls)).not.toContain("must-not-be-saved");
  });

  it("requires authentication for payment reads", async () => {
    const f = fixture();
    expect((await request(f.app).get(`/api/v1/payments/${f.payment.id}`)).status).toBe(401);
  });

  it("requires the patient role for initiation", async () => {
    const f = fixture("DOCTOR");
    const response = await request(f.app).post(`/api/v1/appointments/${f.payment.appointmentId}/payments`).set("Authorization", "Bearer test").send({});
    expect(response.status).toBe(403);
    expect(f.provider.initiate).not.toHaveBeenCalled();
  });

  it("requires a bounded idempotency key", async () => {
    const f = fixture();
    const response = await request(f.app).post(`/api/v1/appointments/${f.payment.appointmentId}/payments`).set("Authorization", "Bearer test").send({});
    expect(response.status).toBe(422);
    expect(f.provider.initiate).not.toHaveBeenCalled();
  });

  it("rejects malformed callback IDs before calling the gateway", async () => {
    const f = fixture();
    expect((await request(f.app).post("/api/v1/payments/sslcommerz/success").type("form").send({ tran_id: "../injected" })).status).toBe(422);
    expect(f.provider.verify).not.toHaveBeenCalled();
  });
});
