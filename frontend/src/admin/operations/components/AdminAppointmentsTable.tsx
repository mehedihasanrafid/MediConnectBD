import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { Table } from "../../../shared/ui/Table";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../../shared/utils/format";
import type { AdminAppointmentRow } from "../hooks/useAdminOperations";

interface AdminAppointmentsTableProps {
  appointments: AdminAppointmentRow[];
  busyId: string | null;
  onCancelAppointment: (appointmentId: string) => Promise<void>;
}

export function AdminAppointmentsTable({
  appointments,
  busyId,
  onCancelAppointment,
}: AdminAppointmentsTableProps) {
  return (
    <Card>
      {appointments.length === 0 ? (
        <EmptyState>No appointments recorded.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Scheduled (Dhaka)</th>
              <th>Mode</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td>{formatDhakaDateTime(a.scheduledStartAt)}</td>
                <td>{a.mode}</td>
                <td>{formatMoney(a.feeAmount)}</td>
                <td>
                  <Badge
                    tone={
                      a.status === "CONFIRMED" || a.status === "COMPLETED"
                        ? "success"
                        : a.status === "PENDING_PAYMENT"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {formatStatus(a.status)}
                  </Badge>
                </td>
                <td>
                  {(a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT") && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyId === a.id}
                      onClick={() => void onCancelAppointment(a.id)}
                    >
                      Cancel (100% refund)
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
