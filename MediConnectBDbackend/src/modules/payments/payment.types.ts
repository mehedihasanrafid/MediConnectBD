/**
 * Payment response, payer input, and verified-provider shapes. Exact decimal strings are used at
 * the gateway/ledger boundary; REVIEW_REQUIRED records a charge that must not automatically
 * confirm a booking.
 */

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REVIEW_REQUIRED";

export interface UnpaidHoldExpirationSummary {
  candidates: number;
  expired: number;
  protected: number;
  skipped: number;
}

/**
 * Exact decimal strings are used at the payment boundary.
 */
export interface PaymentView {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  transactionId: string;
  amount: string;
  currency: "BDT";
  commissionAmount: string | null;
  netAmount: string | null;
  status: PaymentStatus;
  gatewayUrl: string | null;
  expiresAt: Date;
}

export interface PaymentCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
}

export interface VerifiedTransaction {
  transactionId: string;
  amount: string;
  currency: string;
  status: "VALID" | "VALIDATED" | "FAILED" | "CANCELLED" | "PENDING";
  validationId: string | null;
  bankTransactionId: string | null;
  riskLevel: string;
}

/**
 * Normalize without rounding; reject unsupported fractional precision.
 */
export function decimalAmount(value: string): string {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error("Invalid monetary amount");
  const [whole = "0", fraction = ""] = value.split(".");
  return `${BigInt(whole)}.${fraction.padEnd(2, "0")}`;
}

/**
 * Platform commission rate applied to each paid consultation.
 */
export const COMMISSION_RATE_PERCENT = 10n;

/**
 * Splits a captured amount into platform commission and doctor net using integer paisa, so no
 * floating-point error can reach the ledger. Commission rounds half-up to the nearest paisa.
 */
export function splitCommission(amount: string): { commissionAmount: string; netAmount: string } {
  const normalized = decimalAmount(amount);
  const [whole = "0", fraction = "00"] = normalized.split(".");
  const amountPaisa = BigInt(whole) * 100n + BigInt(fraction);
  const commissionPaisa = (amountPaisa * COMMISSION_RATE_PERCENT + 50n) / 100n;
  const netPaisa = amountPaisa - commissionPaisa;
  return {
    commissionAmount: `${commissionPaisa / 100n}.${String(commissionPaisa % 100n).padStart(2, "0")}`,
    netAmount: `${netPaisa / 100n}.${String(netPaisa % 100n).padStart(2, "0")}`,
  };
}
