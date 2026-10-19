/**
 * Payment persistence port. prepare reserves one local transaction before any provider call;
 * applyVerified expects server-verified details and atomically records evidence with the
 * corresponding booking decision.
 */

import type { PaymentView, VerifiedTransaction } from "./payment.types";

export interface PaymentRepository {
  prepare(patientId: string, appointmentId: string, key: string, now: Date, requestHash: string): Promise<{ payment: PaymentView; created: boolean }>;
  saveSession(paymentId: string, sessionId: string, gatewayUrl: string): Promise<PaymentView>;
  findOwned(paymentId: string, patientId: string): Promise<PaymentView | null>;
  findByTransaction(transactionId: string): Promise<PaymentView | null>;
  /**
   * Record a verified event and change the booking in one locked transaction.
   */
  applyVerified(paymentId: string, transaction: VerifiedTransaction, now: Date): Promise<PaymentView>;
}
