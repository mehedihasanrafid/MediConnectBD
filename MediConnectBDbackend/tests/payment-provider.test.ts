import { describe, expect, it, vi } from "vitest";
import { SslcommerzPaymentProvider } from "../src/modules/payments/sslcommerz-payment-provider";
import type { PaymentView } from "../src/modules/payments/payment.types";

const customer = { name: "Test", email: "test@example.com", phone: "01700000000", address: "Test", city: "Dhaka", postcode: "1200" };
const payment: PaymentView = { id: "id", appointmentId: "appointment", patientProfileId: "patient", transactionId: "MCtest",
  amount: "800.10", currency: "BDT", status: "INITIATED", gatewayUrl: null, expiresAt: new Date() };
const valid = { tran_id: "MCtest", amount: "800.10", currency: "BDT", status: "VALID", val_id: "validation", bank_tran_id: "bank", risk_level: "0" };

describe("SSLCommerz sandbox adapter", () => {
  it("sends a form-encoded session request with all callback URLs and the exact amount", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ status: "SUCCESS", sessionkey: "session", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" }));
    await new SslcommerzPaymentProvider("store", "private-password", "https://api.example.com", fetcher).initiate(payment, customer);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://sandbox.sslcommerz.com/gwprocess/v4/api.php");
    const body = options!.body as URLSearchParams;
    expect(body.get("total_amount")).toBe("800.10");
    expect(body.get("ipn_url")).toBe("https://api.example.com/api/v1/payments/sslcommerz/ipn");
    expect(body.get("shipping_method")).toBe("NO");
    expect(options!.redirect).toBe("error");
  });

  it.each(["http://sandbox.sslcommerz.com/pay", "https://attacker.example.com/pay"]) ("rejects an unsafe gateway redirect %s", async (GatewayPageURL) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ status: "SUCCESS", sessionkey: "session", GatewayPageURL }));
    await expect(new SslcommerzPaymentProvider("store", "password", "https://api.example.com", fetcher).initiate(payment, customer)).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_INVALID_RESPONSE" });
  });

  it("calls order validation when a validation ID is present", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(valid));
    const result = await new SslcommerzPaymentProvider("store", "password", "https://api.example.com", fetcher).verify("MCtest", "validation");
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.pathname).toBe("/validator/api/validationserverAPI.php");
    expect(url.searchParams.get("val_id")).toBe("validation");
    expect(result.bankTransactionId).toBe("bank");
  });

  it("queries the provider for failure/cancel callbacks without a validation ID", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ APIConnect: "DONE", element: [{ ...valid, status: "FAILED" }] }));
    const result = await new SslcommerzPaymentProvider("store", "password", "https://api.example.com", fetcher).verify("MCtest");
    expect(result.status).toBe("FAILED");
    expect(new URL(String(fetcher.mock.calls[0]![0])).searchParams.get("tran_id")).toBe("MCtest");
  });

  it("rejects ambiguous provider queries", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ APIConnect: "DONE", element: [valid, valid] }));
    await expect(new SslcommerzPaymentProvider("store", "password", "https://api.example.com", fetcher).verify("MCtest")).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_INVALID_RESPONSE" });
  });

  it("never exposes credential-bearing network errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("https://gateway?store_passwd=private-password"));
    await expect(new SslcommerzPaymentProvider("store", "private-password", "https://api.example.com", fetcher).verify("MCtest")).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_UNAVAILABLE" });
    try { await new SslcommerzPaymentProvider("store", "private-password", "https://api.example.com", fetcher).verify("MCtest"); }
    catch (error) { expect(String(error)).not.toContain("private-password"); }
  });
});
