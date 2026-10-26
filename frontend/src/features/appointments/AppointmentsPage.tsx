/**
 * Patient appointment list showing upcoming and past visits with status, fee, online payment
 * checkout, inline cancellation with refund preview, and post-visit reviews.
 */

import { useCallback, useEffect, useState } from "react";
import { appointmentsApi } from "../../api/appointments";
import { reviewsApi } from "../../api/reviews";
import { Alert, Badge, Button, Card, EmptyState, Field, Spinner } from "../../components/ui";
import {
  hasRefundablePayment,
  previewPatientRefund,
  refundAmountFor,
  type RefundPreview,
} from "../../shared/refund";
import type { Appointment, CancellationOutcome, Review } from "../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../shared/utils/format";
import { PaymentPanel } from "./PaymentPanel";
import { ReviewFormPanel } from "./ReviewFormPanel";

function statusTone(status: string): string {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED" || status === "PAYMENT_EXPIRED" || status === "NO_SHOW") return "danger";
  return "neutral";
}

function isCancellable(appointment: Appointment): boolean {
  return appointment.status === "CONFIRMED" || appointment.status === "PENDING_PAYMENT";
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviewsByAppointment, setReviewsByAppointment] = useState<Record<string, Review>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [appointmentsRes, reviewsRes] = await Promise.all([
        appointmentsApi.listMyAppointments(),
        reviewsApi.listMyReviews().catch(() => ({ items: [] as Review[] })),
      ]);
      setAppointments(appointmentsRes.items);
      const map: Record<string, Review> = {};
      for (const rev of reviewsRes.items) {
        map[rev.appointmentId] = rev;
      }
      setReviewsByAppointment(map);
    } catch {
      setError("Could not load your appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function replaceAppointment(updated: Appointment) {
    setAppointments((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  if (loading) return <Spinner label="Loading appointments…" />;

  const upcoming = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );
  const past = appointments.filter(
    (a) => a.status !== "CONFIRMED" && a.status !== "PENDING_PAYMENT",
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1>My appointments</h1>
        <p className="muted">All times are shown in Bangladesh time (Asia/Dhaka).</p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <h2>Active & Upcoming ({upcoming.length})</h2>
      {upcoming.length === 0 && <EmptyState>No active or upcoming appointments.</EmptyState>}
      {upcoming.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onPaymentUpdated={() => void loadAll()}
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

      <h2>Completed & Past ({past.length})</h2>
      {past.length === 0 && <EmptyState>No past appointments.</EmptyState>}
      {past.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          existingReview={reviewsByAppointment[appointment.id]}
          onReviewCreated={(review) => {
            setReviewsByAppointment((prev) => ({ ...prev, [review.appointmentId]: review }));
            setNotice("Thank you! Your review has been published.");
          }}
        />
      ))}
    </div>
  );
}

function AppointmentCard({
  appointment,
  existingReview,
  onCancelled,
  onPaymentUpdated,
  onReviewCreated,
}: {
  appointment: Appointment;
  existingReview?: Review;
  onCancelled?: (outcome: CancellationOutcome) => void;
  onPaymentUpdated?: () => void;
  onReviewCreated?: (review: Review) => void;
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
      const outcome = await appointmentsApi.cancelAppointment(appointment.id, reason.trim());
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

      {appointment.paymentRequired && appointment.status === "PENDING_PAYMENT" && onPaymentUpdated && (
        <PaymentPanel appointment={appointment} onPaymentUpdated={onPaymentUpdated} />
      )}

      {appointment.cancellationReason && (
        <p className="muted small">Reason: {appointment.cancellationReason}</p>
      )}

      {appointment.status === "COMPLETED" && onReviewCreated && (
        <ReviewFormPanel
          appointmentId={appointment.id}
          existingReview={existingReview}
          onReviewCreated={onReviewCreated}
        />
      )}

      {error && <Alert kind="error">{error}</Alert>}

      {onCancelled && isCancellable(appointment) && (
        <div style={{ marginTop: "0.5rem" }}>
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
        </div>
      )}
    </Card>
  );
}
