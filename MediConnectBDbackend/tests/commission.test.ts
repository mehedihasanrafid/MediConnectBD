import { describe, expect, it } from "vitest";
import { decimalAmount, splitCommission } from "../src/modules/payments/payment.types";

describe("splitCommission", () => {
  it("takes exactly 10% of a whole amount", () => {
    expect(splitCommission("800.00")).toEqual({ commissionAmount: "80.00", netAmount: "720.00" });
  });

  it("rounds commission half-up to the nearest paisa", () => {
    // 805.55 -> 80555 paisa; 10% = 8055.5 -> 8056 paisa.
    expect(splitCommission("805.55")).toEqual({ commissionAmount: "80.56", netAmount: "724.99" });
  });

  it("keeps commission and net summing to the original amount", () => {
    for (const amount of ["0.01", "0.05", "1.00", "99.99", "1234.56", "99999999.99"]) {
      const { commissionAmount, netAmount } = splitCommission(amount);
      const total = BigInt(commissionAmount.replace(".", "")) + BigInt(netAmount.replace(".", ""));
      expect(total).toBe(BigInt(decimalAmount(amount).replace(".", "")));
    }
  });

  it("rounds a sub-paisa commission up rather than losing it", () => {
    // 0.05 -> 5 paisa; 10% = 0.5 paisa -> 1 paisa.
    expect(splitCommission("0.05")).toEqual({ commissionAmount: "0.01", netAmount: "0.04" });
  });

  it("charges no commission on a zero amount", () => {
    expect(splitCommission("0.00")).toEqual({ commissionAmount: "0.00", netAmount: "0.00" });
  });

  it("accepts amounts without a fractional part", () => {
    expect(splitCommission("800")).toEqual({ commissionAmount: "80.00", netAmount: "720.00" });
  });

  it("rejects malformed amounts", () => {
    expect(() => splitCommission("8.0.0")).toThrow("Invalid monetary amount");
    expect(() => splitCommission("abc")).toThrow("Invalid monetary amount");
    expect(() => splitCommission("1.234")).toThrow("Invalid monetary amount");
  });

  it("reports 10% commission and 90% doctor net for legacy payment records without stored commission values", () => {
    const legacyPayment = { amount: "1000.00", commissionAmount: null, netAmount: null };
    const fallback = splitCommission(legacyPayment.amount);
    const commission =
      legacyPayment.commissionAmount !== null
        ? Number(legacyPayment.commissionAmount)
        : Number(fallback.commissionAmount);
    const net =
      legacyPayment.netAmount !== null
        ? Number(legacyPayment.netAmount)
        : Number(fallback.netAmount);

    expect(commission).toBe(100.00);
    expect(net).toBe(900.00);
  });
});
