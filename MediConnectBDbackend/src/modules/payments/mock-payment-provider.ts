/**
 * In-memory / development mock payment provider for sandbox and demo mode.
 * Simulates Bangladeshi payment gateways (bKash, Nagad, Rocket, Cards) without requiring
 * live SSLCommerz merchant keys or public internet webhooks.
 */

import type { PaymentProvider } from "./payment-provider";
import type { PaymentCustomer, PaymentView, VerifiedTransaction } from "./payment.types";

interface StoredMockSession {
  amount: string;
  currency: string;
  status: "VALID" | "FAILED" | "CANCELLED";
  validationId: string;
  bankTransactionId: string;
}

export class MockPaymentProvider implements PaymentProvider {
  public readonly isMock = true;
  private readonly sessions = new Map<string, StoredMockSession>();

  constructor(private readonly appUrl: string = "http://localhost:5173") {}

  async initiate(payment: PaymentView, _customer: PaymentCustomer): Promise<{ sessionId: string; gatewayUrl: string }> {
    const sessionId = `mock_session_${payment.id}`;
    const validationId = `MOCK_VAL_${payment.transactionId}`;
    const bankTransactionId = `MOCK_TXN_${Date.now()}`;

    this.sessions.set(payment.transactionId, {
      amount: payment.amount,
      currency: payment.currency,
      status: "VALID",
      validationId,
      bankTransactionId,
    });

    const gatewayUrl = `${this.appUrl.replace(/\/$/, "")}/payment/simulate?paymentId=${encodeURIComponent(
      payment.id,
    )}&tran_id=${encodeURIComponent(payment.transactionId)}&amount=${encodeURIComponent(
      payment.amount,
    )}&currency=${encodeURIComponent(payment.currency)}`;

    return { sessionId, gatewayUrl };
  }

  setMockOutcome(transactionId: string, status: "VALID" | "FAILED" | "CANCELLED") {
    const session = this.sessions.get(transactionId);
    if (session) {
      session.status = status;
    }
  }

  async verify(transactionId: string, validationId?: string): Promise<VerifiedTransaction> {
    const session = this.sessions.get(transactionId);
    const amount = session ? session.amount : "800.00";
    const currency = session ? session.currency : "BDT";
    let status = session ? session.status : "VALID";

    if (validationId?.includes("FAIL")) {
      status = "FAILED";
    } else if (validationId?.includes("CANCEL")) {
      status = "CANCELLED";
    }

    const valId = validationId || (session ? session.validationId : `MOCK_VAL_${transactionId}`);
    const bankTxnId = session ? session.bankTransactionId : `MOCK_BANK_${Date.now()}`;

    return {
      transactionId,
      amount,
      currency,
      status,
      validationId: valId,
      bankTransactionId: bankTxnId,
      riskLevel: "0",
    };
  }
}
