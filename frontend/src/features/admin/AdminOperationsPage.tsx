/**
 * Admin operations console for monitoring all appointments, payments (with 15% commission),
 * and processing refund requests.
 */

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/admin";
import { appointmentsApi } from "../../api/appointments";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../shared/utils/format";

interface AdminAppointmentRow {
  id: string;
  patientProfileId: string;
  doctorId: string;
  status: string;
  mode: string;
  scheduledStartAt: string;
  feeAmount: string | number;
  createdAt: string;
}

interface AdminPaymentRow {
  id: string;
  appointmentId: string;
  transactionId: string;
  amount: string | number;
  currency: string;
  status: string;
  commissionAmount: string | number | null;
  netAmount: string | number | null;
  createdAt: string;
}

interface AdminRefundRow {
  id: string;
  paymentId: string;
  refundTransactionId: string;
  amount: string | number;
  status: string;
  reason: string;
  createdAt: string;
}

export function AdminOperationsPage() {
  const [tab, setTab] = useState<"APPOINTMENTS" | "PAYMENTS" | "REFUNDS">("APPOINTMENTS");
  const [appointments, setAppointments] = useState<AdminAppointmentRow[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [refunds, setRefunds] = useState<AdminRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apptsRes, payRes, refRes] = await Promise.all([
        adminApi.listAppointments<{ items: AdminAppointmentRow[] }>("limit=30"),
        adminApi.listPayments<{ items: AdminPaymentRow[] }>("limit=30"),
        adminApi.listRefunds<{ items: AdminRefundRow[] }>("limit=30"),
      ]);
      setAppointments(apptsRes.items);
      setPayments(payRes.items);
      setRefunds(refRes.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load operational records."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleAdminCancelAppointment(appointmentId: string) {
    setBusyId(appointmentId);
    setError(null);
    setNotice(null);
    try {
      await appointmentsApi.cancelAppointment(appointmentId, "Cancelled by administrator");
      setNotice("Appointment cancelled with 100% refund eligibility.");
      await loadAll();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not cancel appointment."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmitRefund(refundId: string) {
    setBusyId(refundId);
    setError(null);
    setNotice(null);
    try {
      await adminApi.submitRefund(refundId);
      setNotice("Refund marked as SUBMITTED.");
      await loadAll();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not submit refund."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Bookings, payments & refunds</h1>
        <p className="muted">
          Inspect platform transactions, commission splits, and process refund requests.
        </p>
      </header>

      <div className="row">
        <Button
          variant={tab === "APPOINTMENTS" ? "primary" : "secondary"}
          onClick={() => setTab("APPOINTMENTS")}
        >
          Appointments ({appointments.length})
        </Button>
        <Button
          variant={tab === "PAYMENTS" ? "primary" : "secondary"}
          onClick={() => setTab("PAYMENTS")}
        >
          Payments ({payments.length})
        </Button>
        <Button
          variant={tab === "REFUNDS" ? "primary" : "secondary"}
          onClick={() => setTab("REFUNDS")}
        >
          Refunds ({refunds.length})
        </Button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}
      {loading && <Spinner label="Loading operational records…" />}

      {!loading && tab === "APPOINTMENTS" && (
        <Card>
          {appointments.length === 0 ? (
            <EmptyState>No appointments recorded.</EmptyState>
          ) : (
            <table className="table">
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
                          disabled={busyId === a.id}
                          onClick={() => void handleAdminCancelAppointment(a.id)}
                        >
                          Cancel (100% refund)
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {!loading && tab === "PAYMENTS" && (
        <Card>
          {payments.length === 0 ? (
            <EmptyState>No payments recorded.</EmptyState>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Gross</th>
                  <th>Commission (15%)</th>
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
      )}

      {!loading && tab === "REFUNDS" && (
        <Card>
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
                          onClick={() => void handleSubmitRefund(r.id)}
                        >
                          Mark submitted
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
