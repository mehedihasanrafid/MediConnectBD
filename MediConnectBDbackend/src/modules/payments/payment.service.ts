/**
 * Orchestrates checkout and provider verification without trusting browser callback status. Only
 * matching transaction ID, exact amount, currency, and validation reference may reach the
 * repository; uncertain initiation retains a recoverable payment ID.
 */

import { createHash } from "node:crypto";
import { AppError } from "../../utils/app-error";
import type { PaymentProvider } from "./payment-provider";
import type { PaymentRepository } from "./payment.repository";
import { decimalAmount, type PaymentCustomer, type PaymentView } from "./payment.types";

export class PaymentService {
  constructor(private readonly repository: PaymentRepository, private readonly provider: PaymentProvider | null) {}

  /**
   * Persists a payload hash and payment intent before provider I/O. Retries reuse that intent;
   * uncertain creation errors expose its ID for reconciliation.
   */
  async initiate(patientId: string, appointmentId: string, key: string, customer: PaymentCustomer): Promise<PaymentView> {
    const provider = this.requireProvider();
    const requestHash = createHash("sha256").update(JSON.stringify([appointmentId, customer.name, customer.email, customer.phone, customer.address, customer.city, customer.postcode])).digest("hex");
    const result = await this.repository.prepare(patientId, appointmentId, key, new Date(), requestHash);
    // A request may reach the gateway before the process crashes. Never initiate it twice.
    if (!result.created) {
      if (result.payment.status === "INITIATED") {
        throw new AppError(409, "PAYMENT_INITIATION_PENDING", "Payment initiation is pending reconciliation; check its status before retrying", { paymentId: result.payment.id });
      }
      return result.payment;
    }
    try {
      const session = await provider.initiate(result.payment, customer);
      return await this.repository.saveSession(result.payment.id, session.sessionId, session.gatewayUrl);
    } catch {
      // Return the persisted ID so clients can reconcile even if initiation timed out.
      throw new AppError(502, "PAYMENT_INITIATION_UNCERTAIN", "Checkout could not be completed; reconcile the existing payment before retrying", { paymentId: result.payment.id });
    }
  }

  /**
   * Returns only an owned payment; unrelated/missing records share the same not-found response.
   */
  async getOwned(id: string, patientId: string): Promise<PaymentView> {
    const payment = await this.repository.findOwned(id, patientId);
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
    return payment;
  }

  /**
   * Fetches provider evidence and compares exact expected details before any transactional booking
   * mutation.
   */
  async callback(transactionId: string, validationId?: string): Promise<PaymentView> {
    const provider = this.requireProvider();
    const payment = await this.repository.findByTransaction(transactionId);
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
    // Neither callback status nor the URL name is payment evidence.
    const verified = await provider.verify(transactionId, validationId);
    let matches = false;
    try {
      matches = verified.transactionId === payment.transactionId && verified.currency === payment.currency &&
        decimalAmount(verified.amount) === decimalAmount(payment.amount) &&
        (!validationId || verified.validationId === validationId);
    } catch { /* Malformed provider amounts also fail verification. */ }
    if (!matches) throw new AppError(409, "PAYMENT_VERIFICATION_MISMATCH", "Verified payment details do not match the booking");
    if ((verified.status === "VALID" || verified.status === "VALIDATED") && !verified.bankTransactionId) {
      throw new AppError(502, "PAYMENT_PROVIDER_INVALID_RESPONSE", "The payment provider returned incomplete transaction details");
    }
    return this.repository.applyVerified(payment.id, verified, new Date());
  }

  /**
   * Checks ownership first, then queries the provider using the stored transaction reference.
   */
  async reconcile(id: string, patientId: string): Promise<PaymentView> {
    const payment = await this.getOwned(id, patientId);
    return this.callback(payment.transactionId);
  }

  private requireProvider(): PaymentProvider {
    if (!this.provider) throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "Sandbox payments are not configured");
    return this.provider;
  }
}
