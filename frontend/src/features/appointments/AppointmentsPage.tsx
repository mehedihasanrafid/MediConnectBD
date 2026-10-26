/**
 * Patient appointment list showing upcoming and past visits with status and fee. Cancellable
 * appointments expose an inline confirm panel that previews the refund before committing;
 * rescheduling is still not implemented in the backend.
 */

import { useEffect, useState } from "react";
import { api } from "../../shared/api";
import type { Appointment, CancellationOutcome } from "../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../shared/format";
import { hasRefundablePayment, previewPatientRefund, refundAmountFor, type RefundPreview } from "../../shared/refund";
import { Alert, Badge, Button, Card, EmptyState, Field, Spinner } from "../../components/ui";

function statusTone(status: string): string {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED" || status === "PAYMENT_EXPIRED") return "danger";
  return "neutral";
}

function isCancellable(appointment: Appointment): boolean {
  return appointment.status === "CONFIRMED" || appointment.status === "PENDING_PAYMENT";
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ items: Appointment[] }>("/appointments/me")
      .then((result) => setAppointments(result.items))
      .catch(() => setError("Could not load your appointments."))
      .finally(() => setLoading(false));
  }, []);

  function replaceAppointment(updated: Appointment) {
    setAppointments((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  if (loading) return <Spinner label="Loading appointments…" />;

  const now = Date.now();
  const upcoming = appointments.filter((a) => new Date(a.scheduledStartAt).getTime() >= now);
  const past = appointments.filter((a) => new Date(a.scheduledStartAt).getTime() < now);

  return (
    <div className="page">
      <header className="page-header">
        <h1>My appointments</h1>
        <p className="muted">All times are shown in Bangladesh time.</p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <h2>Upcoming ({upcoming.length})</h2>
      {upcoming.length === 0 && <EmptyState>No upcoming appointments.</EmptyState>}
      {upcoming.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onCancelled={(outcome) => {
            replaceAppointment(outcome.appointment);
            setNotice(
              outcome.refundId
                ? `Appointment cancelled. A refund of ${formatMoney(outcome.refundAmount)} has been requested.`
                : "Appointment cancelled.",
            );
          }}
        />
      ))}

      <h2>Past ({past.length})</h2>
      {past.length === 0 && <EmptyState>No past appointments.</EmptyState>}
      {past.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </div>
  );
}

function AppointmentCard({
  appointment,
  onCancelled,
}: {
  appointment: Appointment;
  onCancelled?: (outcome: CancellationOutcome) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RefundPreview | null>(null);

  const refundable = hasRefundablePayment(appointment.mode, appointment.status);
  const previewAmount =
    refundable && preview
      ? refundAmountFor(appointment.feeAmount.toFixed(2), preview.refundPercent)
      : "0.00";

  function startConfirming() {
    setPreview(previewPatientRefund(appointment.scheduledStartAt, new Date()));
    setConfirming(true);
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const outcome = await api.cancelAppointment(appointment.id, reason.trim());
      setConfirming(false);
      onCancelled?.(outcome);
    } catch {
      setError("Could not cancel this appointment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="row space-between">
        <div>
          <h3>{formatDhakaDateTime(appointment.scheduledStartAt)}</h3>
          <p className="muted small">
            {appointment.mode} consultation · {formatMoney(appointment.feeAmount)}
          </p>
        </div>
        <Badge tone={statusTone(appointment.status)}>{formatStatus(appointment.status)}</Badge>
      </div>
      {appointment.paymentRequired && appointment.status === "PENDING_PAYMENT" && (
        <Alert kind="info">Payment is required to confirm this video consultation.</Alert>
      )}
      {appointment.cancellationReason && (
        <p className="muted small">Reason: {appointment.cancellationReason}</p>
      )}

      {error && <Alert kind="error">{error}</Alert>}

      {onCancelled && isCancellable(appointment) && (
        <>
          {confirming ? (
            <div className="filters">
              <p className="muted small">
                {refundable && preview
                  ? `${preview.reason} That is ${formatMoney(previewAmount)} of ${formatMoney(appointment.feeAmount)}.`
                  : "This appointment has no captured payment, so nothing will be refunded."}
              </p>
              <Field
                label="Reason (optional)"
                value={reason}
                onChange={setReason}
                placeholder="Why are you cancelling?"
              />
              <Button variant="danger" disabled={busy} onClick={() => void cancel()}>
                {busy ? "Cancelling…" : "Confirm cancellation"}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
                Keep appointment
              </Button>
            </div>
          ) : (
            <div className="row">
              <Button variant="danger" onClick={startConfirming}>
                Cancel appointment
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
