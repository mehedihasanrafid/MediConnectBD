import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminRefundsTable } from "../components/AdminRefundsTable";
import type { AdminRefundRow } from "../hooks/useAdminOperations";

describe("AdminRefundsTable", () => {
  const dummyRefunds: AdminRefundRow[] = [
    {
      id: "ref-1",
      paymentId: "pay-1",
      refundTransactionId: "REF-TX-1001",
      amount: "800.00",
      status: "REQUESTED",
      reason: "Patient cancelled >24h ahead",
      createdAt: "2026-10-27T10:00:00.000Z",
    },
    {
      id: "ref-2",
      paymentId: "pay-2",
      refundTransactionId: "REF-TX-1002",
      amount: "400.00",
      status: "SUBMITTED",
      reason: "Patient cancelled 2-24h ahead",
      createdAt: "2026-10-27T11:00:00.000Z",
    },
  ];

  it("renders the manual processing notice and explicit 'Mark for manual refund' action", () => {
    const html = renderToString(
      <AdminRefundsTable
        refunds={dummyRefunds}
        busyId={null}
        onSubmitRefund={async () => {}}
      />,
    );

    // Explanatory note explaining manual provider/bank processing
    expect(html).toContain("Refunds must be processed manually via your payment provider");
    expect(html).toContain("updates internal operational tracking");

    // Action button makes the manual workflow explicit
    expect(html).toContain("Mark for manual refund");
    expect(html).not.toContain("Mark submitted");
  });

  it("displays empty state when there are no refund requests", () => {
    const html = renderToString(
      <AdminRefundsTable
        refunds={[]}
        busyId={null}
        onSubmitRefund={async () => {}}
      />,
    );

    expect(html).toContain("No refund requests.");
  });
});
