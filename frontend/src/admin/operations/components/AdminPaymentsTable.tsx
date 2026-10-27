import { Badge, Card, EmptyState } from "../../../components/ui";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../../shared/utils/format";
import type { AdminPaymentRow } from "../hooks/useAdminOperations";

interface AdminPaymentsTableProps {
  payments: AdminPaymentRow[];
}

export function AdminPaymentsTable({ payments }: AdminPaymentsTableProps) {
  return (
    <Card>
      {payments.length === 0 ? (
        <EmptyState>No payments recorded.</EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Gross</th>
              <th>Commission (10%)</th>
              <th>Doctor Net</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.transactionId}</td>
                <td>{formatMoney(p.amount)}</td>
                <td>{formatMoney(p.commissionAmount)}</td>
                <td>{formatMoney(p.netAmount)}</td>
                <td>
                  <Badge tone={p.status === "SUCCEEDED" ? "success" : "warning"}>
                    {formatStatus(p.status)}
                  </Badge>
                </td>
                <td className="muted small">{formatDhakaDateTime(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
