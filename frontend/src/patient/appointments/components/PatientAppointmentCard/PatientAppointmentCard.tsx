import { useState } from "react";

import { appointmentsApi } from "../../../../api/appointments";
import { Alert, Badge, Button, Card, Cluster, Field, Text } from "../../../../shared/ui";
import {
  hasRefundablePayment,
  previewPatientRefund,
  refundAmountFor,
  type RefundPreview,
} from "../../../../shared/refund";
import type { Appointment, CancellationOutcome, Review } from "../../../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../../../shared/utils/format";
import {
  appointmentStatusTone,
  isAppointmentCancellable,
} from "../../utils/patientAppointments.utils";
import { PaymentPanel } from "../PaymentPanel";
import { ReschedulePanel } from "../ReschedulePanel";
import { ReviewFormPanel } from "../ReviewFormPanel";
import { VideoSessionPanel } from "../VideoSessionPanel";
import styles from "./PatientAppointmentCard.module.css";

interface PatientAppointmentCardProps {
  appointment: Appointment;
  existingReview?: Review;
  onCancelled?: (outcome: CancellationOutcome) => void;
  onRescheduled?: (updated: Appointment) => void;
  onPaymentUpdated?: () => void;
  onReviewCreated?: (review: Review) => void;
}

/**
 * Renders one patient appointment card with online checkout, video room, rescheduling,
 * refund-preview cancellation, and post-visit review authoring.
 */
export function PatientAppointmentCard({
  appointment,
  existingReview,
  onCancelled,
  onRescheduled,
  onPaymentUpdated,
  onReviewCreated,
}: PatientAppointmentCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [joiningVideo, setJoiningVideo] = useState(false);
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
    } catch (caught: unknown) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not cancel appointment. It may already be completed or locked.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            Appointment #{appointment.id.slice(0, 8)}
          </h3>
          <Text tone="muted" size="sm">
            Mode: {appointment.mode}
            {appointment.familyMember
              ? ` · Patient: ${appointment.familyMember.name} (${appointment.familyMember.relationship})`
              : " · Patient: Self"}
          </Text>
        </div>
        <Cluster gap={2}>
          <Badge tone={appointment.mode === "VIDEO" ? "info" : "neutral"}>
            {appointment.mode}
          </Badge>
          <Badge tone={appointmentStatusTone(appointment.status)}>
            {formatStatus(appointment.status)}
          </Badge>
        </Cluster>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Scheduled time</dt>
          <dd>{formatDhakaDateTime(appointment.scheduledStartAt)}</dd>
        </div>
        <div>
          <dt>Consultation fee</dt>
          <dd>{formatMoney(appointment.feeAmount)}</dd>
        </div>
        {appointment.slot?.chamber && (
          <div>
            <dt>Chamber</dt>
            <dd>Unit: {appointment.slot.chamber.roomOrUnit ?? "General"}</dd>
          </div>
        )}
      </dl>

      {error && <Alert kind="error">{error}</Alert>}

      {appointment.mode === "VIDEO" && onPaymentUpdated && (
        <PaymentPanel appointment={appointment} onPaymentUpdated={onPaymentUpdated} />
      )}

      {appointment.mode === "VIDEO" && appointment.status === "CONFIRMED" && (
        <div className={styles.videoRow}>
          <Button onClick={() => setJoiningVideo(!joiningVideo)}>
            {joiningVideo ? "Hide video room" : "Join video session"}
          </Button>
        </div>
      )}

      {joiningVideo && (
        <VideoSessionPanel
          appointmentId={appointment.id}
          onClose={() => setJoiningVideo(false)}
        />
      )}

      {appointment.status === "COMPLETED" && onReviewCreated && (
        <ReviewFormPanel
          appointmentId={appointment.id}
          existingReview={existingReview}
          onReviewCreated={onReviewCreated}
        />
      )}

      <div className={styles.actions}>
        {isAppointmentCancellable(appointment) && onRescheduled && (
          <Button
            variant="secondary"
            disabled={busy || rescheduling}
            onClick={() => setRescheduling(!rescheduling)}
          >
            {rescheduling ? "Close rescheduling" : "Reschedule visit"}
          </Button>
        )}

        {isAppointmentCancellable(appointment) && onCancelled && (
          <Button variant="danger" disabled={busy} onClick={startConfirming}>
            Cancel appointment
          </Button>
        )}
      </div>

      {rescheduling && onRescheduled && (
        <ReschedulePanel
          appointment={appointment}
          onRescheduled={(updated) => {
            setRescheduling(false);
            onRescheduled(updated);
          }}
          onCancel={() => setRescheduling(false)}
        />
      )}

      {confirming && (
        <div className={styles.cancelConfirmBox}>
          {refundable && preview ? (
            <Alert kind="info">
              Refund policy: {preview.reason} ({preview.refundPercent}%
              refund = ৳{previewAmount}).
              {preview.refundPercent === 0 &&
                " Cancellation within 2 hours of visit is non-refundable."}
            </Alert>
          ) : (
            <Alert kind="info">
              This cancellation is non-refundable (chamber consultation or unpaid).
            </Alert>
          )}

          <Field
            label="Reason for cancellation (optional)"
            value={reason}
            onChange={setReason}
            placeholder="e.g. Schedule conflict"
          />

          <Cluster gap={2}>
            <Button variant="danger" disabled={busy} onClick={cancel}>
              {busy ? "Cancelling…" : "Confirm cancellation"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
              Keep appointment
            </Button>
          </Cluster>
        </div>
      )}
    </Card>
  );
}
