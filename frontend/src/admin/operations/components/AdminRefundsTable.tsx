import { Badge, Button, Card, EmptyState } from "../../../components/ui";
import { formatMoney, formatStatus } from "../../../shared/utils/format";
import type { AdminRefundRow } from "../hooks/useAdminOperations";

interface AdminRefundsTableProps {
  refunds: AdminRefundRow[];
  busyId: string | null;
  onSubmitRefund: (refundId: string) => Promise<void>;
}

export function AdminRefundsTable({
  refunds,
  busyId,
  onSubmitRefund,
}: AdminRefundsTableProps) {
  return (
    <Card>
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ margin: "0 0 0.25rem 0" }}>Refund Requests</h3>
        <p className="muted small" style={{ margin: 0 }}>
          Refunds must be processed manually via your payment provider (SSLCommerz) or bank portal.
          Marking a record here updates internal operational tracking and indicates manual payout has been initiated.
        </p>
      </div>

      {refunds.length === 0 ? (
        <EmptyState>No refund requests.</EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Refund Tx ID</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id}>
                <td>{r.refundTransactionId}</td>
                <td>{formatMoney(r.amount)}</td>
                <td className="muted small">{r.reason}</td>
                <td>
                  <Badge tone={r.status === "SUBMITTED" ? "success" : "warning"}>
                    {formatStatus(r.status)}
                  </Badge>
                </td>
                <td>
                  {r.status === "REQUESTED" && (
                    <Button
                      disabled={busyId === r.id}
                      onClick={() => void onSubmitRefund(r.id)}
                    >
                      Mark for manual refund
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
