import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { Table } from "../../../shared/ui/Table";
import { Text } from "../../../shared/ui/Text";
import { formatMoney, formatStatus } from "../../../shared/utils/format";
import type { AdminRefundRow } from "../hooks/useAdminOperations";
import styles from "./AdminRefundsTable.module.css";

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
      <div className={styles.header}>
        <h3 className={styles.title}>Refund Requests</h3>
        <p className={styles.notice}>
          Refunds must be processed manually via your payment provider (SSLCommerz) or bank portal.
          Marking a record here updates internal operational tracking and indicates manual payout has been initiated.
        </p>
      </div>

      {refunds.length === 0 ? (
        <EmptyState>No refund requests.</EmptyState>
      ) : (
        <Table>
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
                <td>
                  <Text tone="muted" size="sm">
                    {r.reason}
                  </Text>
                </td>
                <td>
                  <Badge tone={r.status === "SUBMITTED" ? "success" : "warning"}>
                    {formatStatus(r.status)}
                  </Badge>
                </td>
                <td>
                  {r.status === "REQUESTED" && (
                    <Button
                      size="sm"
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
        </Table>
      )}
    </Card>
  );
}
