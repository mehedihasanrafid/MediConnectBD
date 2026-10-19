/**
 * Hosted-checkout adapter restricted to the SSLCommerz sandbox. TLS stays enabled, redirects are
 * refused for provider requests, returned gateway hosts are checked, and credential-bearing
 * transport errors are replaced by safe errors.
 */

import { z } from "zod";
import { AppError } from "../../utils/app-error";
import type { PaymentProvider } from "./payment-provider";
import type { PaymentCustomer, PaymentView, VerifiedTransaction } from "./payment.types";

const transactionSchema = z.object({
  tran_id: z.string().min(1), amount: z.union([z.string(), z.number()]).transform(String),
  currency: z.string(), status: z.enum(["VALID", "VALIDATED", "FAILED", "CANCELLED", "PENDING"]),
  val_id: z.string().nullish(), bank_tran_id: z.string().nullish(),
  risk_level: z.union([z.string(), z.number()]).transform(String).optional(),
});

/**
 * Sandbox only. Credentials and raw provider responses must never be logged.
 */
export class SslcommerzPaymentProvider implements PaymentProvider {
  private readonly baseUrl = "https://sandbox.sslcommerz.com";
  constructor(private readonly storeId: string, private readonly storePassword: string,
    private readonly callbackBaseUrl: string, private readonly fetcher: typeof fetch = fetch) {}

  /**
   * Posts the server-held price and transaction reference with explicit callback URLs and
   * validated payer data.
   */
  async initiate(payment: PaymentView, customer: PaymentCustomer): Promise<{ sessionId: string; gatewayUrl: string }> {
    const callback = `${this.callbackBaseUrl.replace(/\/$/, "")}/api/v1/payments/sslcommerz`;
    const body = new URLSearchParams({
      store_id: this.storeId, store_passwd: this.storePassword, total_amount: payment.amount,
      currency: payment.currency, tran_id: payment.transactionId,
      success_url: `${callback}/success`, fail_url: `${callback}/fail`, cancel_url: `${callback}/cancel`, ipn_url: `${callback}/ipn`,
      cus_name: customer.name, cus_email: customer.email, cus_phone: customer.phone,
      cus_add1: customer.address, cus_city: customer.city, cus_postcode: customer.postcode, cus_country: "Bangladesh",
      shipping_method: "NO", num_of_item: "1", product_name: "Video consultation",
      product_category: "healthcare", product_profile: "non-physical-goods", emi_option: "0",
    });
    const data = await this.request(`${this.baseUrl}/gwprocess/v4/api.php`, { method: "POST", body });
    const result = z.object({ status: z.literal("SUCCESS"), sessionkey: z.string().min(1).max(100), GatewayPageURL: z.string().url().max(1000) }).safeParse(data);
    if (!result.success) throw this.invalidResponse();
    const gateway = new URL(result.data.GatewayPageURL);
    if (gateway.protocol !== "https:" || gateway.hostname !== "sandbox.sslcommerz.com" || gateway.username || gateway.password) throw this.invalidResponse();
    return { sessionId: result.data.sessionkey, gatewayUrl: result.data.GatewayPageURL };
  }

  /**
   * Uses order validation when a validation ID exists; otherwise queries by transaction ID and
   * rejects ambiguous results.
   */
  async verify(transactionId: string, validationId?: string): Promise<VerifiedTransaction> {
    const path = validationId ? "validationserverAPI.php" : "merchantTransIDvalidationAPI.php";
    const url = new URL(`${this.baseUrl}/validator/api/${path}`);
    url.search = new URLSearchParams({ store_id: this.storeId, store_passwd: this.storePassword,
      format: "json", ...(validationId ? { val_id: validationId } : { tran_id: transactionId }) }).toString();
    const data = await this.request(url.toString(), { method: "GET" });
    let transaction: unknown = data;
    if (!validationId) {
      const query = z.object({ APIConnect: z.literal("DONE"), element: z.array(transactionSchema).min(1) }).safeParse(data);
      // Ambiguous results require a validation ID; never guess which charge won.
      if (!query.success || query.data.element.length !== 1) throw this.invalidResponse();
      transaction = query.data.element[0];
    }
    const result = transactionSchema.safeParse(transaction);
    if (!result.success) throw this.invalidResponse();
    return { transactionId: result.data.tran_id, amount: result.data.amount, currency: result.data.currency,
      status: result.data.status, validationId: result.data.val_id ?? null,
      bankTransactionId: result.data.bank_tran_id ?? null, riskLevel: result.data.risk_level ?? "1" };
  }

  /**
   * Limits network time and refuses redirects; catch errors without propagating credential-bearing
   * URLs.
   */
  private async request(url: string, options: RequestInit): Promise<unknown> {
    try {
      const response = await this.fetcher(url, { ...options, signal: AbortSignal.timeout(15_000), redirect: "error" });
      if (!response.ok) throw this.invalidResponse();
      return await response.json();
    } catch {
      // Network errors can contain credential-bearing URLs: return only a safe error.
      throw new AppError(502, "PAYMENT_PROVIDER_UNAVAILABLE", "The payment provider could not be reached; check payment status before retrying");
    }
  }

  private invalidResponse(): AppError {
    return new AppError(502, "PAYMENT_PROVIDER_INVALID_RESPONSE", "The payment provider returned an unexpected response");
  }
}
