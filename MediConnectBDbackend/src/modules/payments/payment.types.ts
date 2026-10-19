/**
 * Payment response, payer input, and verified-provider shapes. Exact decimal strings are used at
 * the gateway/ledger boundary; REVIEW_REQUIRED records a charge that must not automatically
 * confirm a booking.
 */

export type PaymentStatus = "INITIATED" | "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REVIEW_REQUIRED";

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
