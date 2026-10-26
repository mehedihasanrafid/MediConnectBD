/**
 * Cancellation refund policy. Kept pure and clock-injected so every tier boundary is testable
 * without a database. Refund percentages are whole numbers; the caller converts them to an exact
 * decimal amount.
 */

export type CancellationActor = "PATIENT" | "DOCTOR" | "ADMIN";

export interface RefundDecision {
  refundPercent: number;
  reason: string;
}

const FULL_REFUND_HOURS = 24;
const HALF_REFUND_HOURS = 2;
const MILLISECONDS_PER_HOUR = 3_600_000;

/**
 * A doctor or admin cancellation always refunds in full. A patient refund depends on how long
 * remains before the appointment: more than 24 hours is full, 2 to 24 hours is half, and under
 * 2 hours is none. Boundaries are inclusive at the lower edge of each band.
 */
export function decideRefund(
  actor: CancellationActor,
  scheduledStartAt: Date,
  now: Date,
): RefundDecision {
  if (actor === "DOCTOR" || actor === "ADMIN") {
    return { refundPercent: 100, reason: `${actor.toLowerCase()} cancelled the appointment` };
  }

  const hoursUntilStart = (scheduledStartAt.getTime() - now.getTime()) / MILLISECONDS_PER_HOUR;

  if (hoursUntilStart > FULL_REFUND_HOURS) {
    return { refundPercent: 100, reason: "Cancelled more than 24 hours before the appointment" };
  }
  if (hoursUntilStart >= HALF_REFUND_HOURS) {
    return { refundPercent: 50, reason: "Cancelled between 2 and 24 hours before the appointment" };
  }
  return { refundPercent: 0, reason: "Cancelled less than 2 hours before the appointment" };
}

/**
 * Applies a whole-number percentage to an exact decimal amount using integer paisa, so no
 * floating-point error can reach the refund ledger. Rounds half-up to the nearest paisa.
 */
export function refundAmountFor(amount: string, refundPercent: number): string {
  if (!Number.isInteger(refundPercent) || refundPercent < 0 || refundPercent > 100) {
    throw new Error("Refund percent must be a whole number between 0 and 100");
  }
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(amount)) throw new Error("Invalid monetary amount");
  const [whole = "0", fraction = ""] = amount.split(".");
  const amountPaisa = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const refundPaisa = (amountPaisa * BigInt(refundPercent) + 50n) / 100n;
  return `${refundPaisa / 100n}.${String(refundPaisa % 100n).padStart(2, "0")}`;
}
