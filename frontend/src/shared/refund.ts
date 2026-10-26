/**
 * Client-side mirror of the backend cancellation refund policy, used only to preview the outcome
 * before the patient commits. The server recomputes the decision and remains authoritative; this
 * exists so the patient is not surprised by the amount after cancelling.
 *
 * Keep the tier boundaries in step with `MediConnectBDbackend/src/modules/appointments/cancellation-policy.ts`.
 */

const FULL_REFUND_HOURS = 24;
const HALF_REFUND_HOURS = 2;
const MILLISECONDS_PER_HOUR = 3_600_000;

export interface RefundPreview {
  refundPercent: number;
  refundAmount: string;
  reason: string;
}

/**
 * Applies a whole-number percentage to an exact decimal amount using integer paisa, matching the
 * backend's half-up rounding so the preview cannot disagree with the recorded refund.
 */
export function refundAmountFor(amount: string, refundPercent: number): string {
  const [whole = "0", fraction = ""] = amount.split(".");
  const amountPaisa = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const refundPaisa = (amountPaisa * BigInt(refundPercent) + 50n) / 100n;
  return `${refundPaisa / 100n}.${String(refundPaisa % 100n).padStart(2, "0")}`;
}

/**
 * A patient refund depends on how long remains before the appointment: more than 24 hours is
 * full, 2 to 24 hours is half, and under 2 hours is none. Boundaries are inclusive at the lower
 * edge of each band.
 */
export function previewPatientRefund(scheduledStartAt: string, now: Date): RefundPreview {
  const hoursUntilStart =
    (new Date(scheduledStartAt).getTime() - now.getTime()) / MILLISECONDS_PER_HOUR;

  if (hoursUntilStart > FULL_REFUND_HOURS) {
    return {
      refundPercent: 100,
      refundAmount: "0.00",
      reason: "More than 24 hours before the appointment, so you get a full refund.",
    };
  }
  if (hoursUntilStart >= HALF_REFUND_HOURS) {
    return {
      refundPercent: 50,
      refundAmount: "0.00",
      reason: "Between 2 and 24 hours before the appointment, so you get a 50% refund.",
    };
  }
  return {
    refundPercent: 0,
    refundAmount: "0.00",
    reason: "Less than 2 hours before the appointment, so no refund is due.",
  };
}

/**
 * Only a captured online payment can be refunded. Chamber visits are paid at the desk and an
 * unpaid video booking has no payment yet, so both refund nothing regardless of the tier.
 */
export function hasRefundablePayment(mode: string, status: string): boolean {
  return mode === "VIDEO" && status === "CONFIRMED";
}
