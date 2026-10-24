import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PaymentProvider } from "../src/modules/payments/payment-provider";
import type { PaymentRepository } from "../src/modules/payments/payment.repository";
import { PaymentService } from "../src/modules/payments/payment.service";
import { decimalAmount, type PaymentView, type VerifiedTransaction } from "../src/modules/payments/payment.types";

const customer = { name: "Synthetic Patient", email: "patient@example.com", phone: "01700000000", address: "Test road", city: "Dhaka", postcode: "1200" };
function fixture() {
  const payment: PaymentView = { id: randomUUID(), appointmentId: randomUUID(), patientProfileId: randomUUID(),
    transactionId: "MCtest", amount: "800.00", currency: "BDT", status: "PENDING", gatewayUrl: null, expiresAt: new Date(Date.now() + 600000) };
  const verified: VerifiedTransaction = { transactionId: payment.transactionId, amount: "800", currency: "BDT", status: "VALID",
    validationId: "validation", bankTransactionId: "bank", riskLevel: "0" };
  const repository = {
    prepare: vi.fn().mockResolvedValue({ payment, created: true }),
    saveSession: vi.fn().mockResolvedValue(payment), findOwned: vi.fn().mockResolvedValue(payment),
    findByTransaction: vi.fn().mockResolvedValue(payment), applyVerified: vi.fn().mockResolvedValue(payment),
    expireUnpaidHolds: vi.fn().mockResolvedValue({ candidates: 1, expired: 1, protected: 0, skipped: 0 }),
  } satisfies PaymentRepository;
  const provider = { initiate: vi.fn().mockResolvedValue({ sessionId: "session", gatewayUrl: "https://sandbox.sslcommerz.com/pay" }),
    verify: vi.fn().mockResolvedValue(verified) } satisfies PaymentProvider;
  return { payment, repository, provider, verified, service: new PaymentService(repository, provider) };
}

describe("PaymentService", () => {
  it("creates a session with a stored payload hash and exact booking amount", async () => {
    const f = fixture();
    await f.service.initiate(f.payment.patientProfileId, f.payment.appointmentId, "idempotency_key_123", customer);
    expect(f.repository.prepare).toHaveBeenCalledWith(f.payment.patientProfileId, f.payment.appointmentId, "idempotency_key_123", expect.any(Date), expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(f.provider.initiate).toHaveBeenCalledWith(f.payment, customer);
    expect(f.repository.saveSession).toHaveBeenCalledWith(f.payment.id, "session", "https://sandbox.sslcommerz.com/pay");
  });

  it("does not contact the gateway again for an existing payment", async () => {
    const f = fixture();
    f.repository.prepare.mockResolvedValue({ payment: f.payment, created: false });
    await f.service.initiate("patient", "appointment", "idempotency_key_123", customer);
    expect(f.provider.initiate).not.toHaveBeenCalled();
  });

  it("keeps an uncertain initiation for reconciliation rather than charging twice", async () => {
    const f = fixture();
    f.payment.status = "INITIATED";
    f.repository.prepare.mockResolvedValue({ payment: f.payment, created: false });
    await expect(f.service.initiate("patient", "appointment", "idempotency_key_123", customer)).rejects.toMatchObject({ code: "PAYMENT_INITIATION_PENDING" });
    expect(f.provider.initiate).not.toHaveBeenCalled();
  });

  it("returns the persisted payment ID after a checkout timeout", async () => {
    const f = fixture();
    f.provider.initiate.mockRejectedValue(new Error("sensitive internal network error"));
    await expect(f.service.initiate("patient", "appointment", "idempotency_key_123", customer)).rejects.toMatchObject({
      code: "PAYMENT_INITIATION_UNCERTAIN", details: { paymentId: f.payment.id },
    });
    expect(f.repository.saveSession).not.toHaveBeenCalled();
  });

  it.each([
    { amount: "799.99" }, { amount: "800.001" }, { currency: "USD" }, { transactionId: "other" }, { validationId: "other" },
  ])("rejects verified payment detail mismatch %j", async (changes) => {
    const f = fixture();
    f.provider.verify.mockResolvedValue({ ...f.verified, ...changes });
    await expect(f.service.callback("MCtest", "validation")).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_MISMATCH" });
    expect(f.repository.applyVerified).not.toHaveBeenCalled();
  });

  it("verifies callbacks at the provider before any booking write", async () => {
    const f = fixture();
    await f.service.callback("MCtest", "validation");
    expect(f.provider.verify).toHaveBeenCalledWith("MCtest", "validation");
    expect(f.repository.applyVerified).toHaveBeenCalledWith(f.payment.id, f.verified, expect.any(Date));
  });

  it("does not write anything when provider verification fails", async () => {
    const f = fixture();
    f.provider.verify.mockRejectedValue(new Error("provider offline"));
    await expect(f.service.callback("MCtest")).rejects.toThrow("provider offline");
    expect(f.repository.applyVerified).not.toHaveBeenCalled();
  });

  it("checks ownership before reconciliation", async () => {
    const f = fixture();
    f.repository.findOwned.mockResolvedValue(null);
    await expect(f.service.reconcile(f.payment.id, "unrelated-patient")).rejects.toMatchObject({ statusCode: 404 });
    expect(f.provider.verify).not.toHaveBeenCalled();
  });

  it("returns 503 when sandbox credentials are absent", async () => {
    const f = fixture();
    await expect(new PaymentService(f.repository, null).initiate("patient", "appointment", "key", customer)).rejects.toMatchObject({ code: "PAYMENTS_NOT_CONFIGURED" });
    expect(f.repository.prepare).not.toHaveBeenCalled();
  });

  it("runs bounded hold expiry without requiring payment-provider credentials", async () => {
    const f = fixture();
    const now = new Date("2026-10-19T10:00:00.000Z");
    const service = new PaymentService(f.repository, null, () => now);

    const result = await service.expireUnpaidHolds(25);

    expect(result.expired).toBe(1);
    expect(f.repository.expireUnpaidHolds).toHaveBeenCalledWith(now, 25);
    expect(f.provider.verify).not.toHaveBeenCalled();
  });

  it("rejects unsafe worker batch sizes before accessing persistence", async () => {
    const f = fixture();
    expect(() => f.service.expireUnpaidHolds(0)).toThrow(/batch size/i);
    expect(f.repository.expireUnpaidHolds).not.toHaveBeenCalled();
  });

  it("normalizes decimal amounts without floating point rounding", () => {
    expect(decimalAmount("0800.1")).toBe("800.10");
    expect(() => decimalAmount("800.001")).toThrow();
    expect(() => decimalAmount("8e2")).toThrow();
    expect(() => decimalAmount("-10")).toThrow();
  });
});
