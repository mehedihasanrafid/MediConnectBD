/**
 * Transport contract separating SSLCommerz HTTP calls from payment rules. Tests inject a provider
 * double; production business code must never depend on a browser-supplied transaction result.
 */

import type { PaymentCustomer, PaymentView, VerifiedTransaction } from "./payment.types";

/**
 * Network transport is injected so tests never charge a real account.
 */
export interface PaymentProvider {
  initiate(payment: PaymentView, customer: PaymentCustomer): Promise<{ sessionId: string; gatewayUrl: string }>;
  verify(transactionId: string, validationId?: string): Promise<VerifiedTransaction>;
}
