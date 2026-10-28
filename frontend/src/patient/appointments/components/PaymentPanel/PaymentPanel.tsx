/**
 * Online payment checkout & reconciliation panel for video consultations in PENDING_PAYMENT state.
 * Sends a stable Idempotency-Key per appointment so retries reuse the same payment record.
 */

import { useState } from "react";

import { paymentsApi } from "../../../../api/payments";
import { Alert, Badge, Button, Cluster, Field, Text } from "../../../../shared/ui";
import { useAuth } from "../../../../features/auth/AuthContext";
import type { Appointment, Payment } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatMoney, formatStatus } from "../../../../shared/utils/format";
import styles from "./PaymentPanel.module.css";

export function PaymentPanel({
  appointment,
  initialPayment,
  onPaymentUpdated,
}: {
  appointment: Appointment;
  initialPayment?: Payment | null;
  onPaymentUpdated: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : "Demo Patient",
  );
  const [email, setEmail] = useState(user?.email ?? "patient.demo@mediconnect.example");
  const [phone, setPhone] = useState("01700000000");
  const [address, setAddress] = useState("Dhanmondi");
  const [city, setCity] = useState("Dhaka");
  const [postcode, setPostcode] = useState("1209");

  const [payment, setPayment] = useState<Payment | null>(initialPayment ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    kind: "success" | "info";
    text: string;
  } | null>(null);

  const idempotencyKey = `checkout_${appointment.id.replaceAll("-", "")}`;

  async function handleInitiate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const created = await paymentsApi.initiate(
        appointment.id,
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          postcode: postcode.trim(),
        },
        idempotencyKey,
      );
      setPayment(created);
      if (created.status === "SUCCEEDED") {
        setStatusMessage({
          kind: "success",
          text: "Payment verified successfully! Your consultation slot is confirmed.",
        });
        onPaymentUpdated();
      } else {
        setStatusMessage({
          kind: "info",
          text: "Payment session ready. Complete your payment in the SSLCommerz portal, then click 'I completed payment - verify now'.",
        });
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not initiate payment checkout."));
    } finally {
      setBusy(false);
    }
  }

  async function handleReconcile() {
    if (!payment) return;
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const refreshed = await paymentsApi.reconcile(payment.id);
      setPayment(refreshed);
      if (refreshed.status === "SUCCEEDED") {
        setStatusMessage({
          kind: "success",
          text: "Payment verified successfully! Your consultation slot is confirmed.",
        });
        onPaymentUpdated();
      } else if (refreshed.status === "FAILED") {
        setError(
          "Payment verification failed or the transaction was cancelled at the provider. Please try checking out again.",
        );
      } else {
        setStatusMessage({
          kind: "info",
          text: "Payment has not been confirmed by the provider yet. If you just completed payment, please wait a moment and click verify again.",
        });
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not verify payment status with provider."));
    } finally {
      setBusy(false);
    }
  }

  if (appointment.status !== "PENDING_PAYMENT") {
    return null;
  }

  return (
    <div className={styles.container}>
      <Cluster justify="between" className={styles.headerRow}>
        <div>
          <strong>Payment required</strong>
          <Text tone="muted" size="sm">
            Amount: {formatMoney(appointment.feeAmount)} · Pay online to confirm your video
            consultation slot.
          </Text>
        </div>
        <Button variant={open ? "secondary" : "primary"} onClick={() => setOpen(!open)}>
          {open ? "Close checkout" : "Pay now"}
        </Button>
      </Cluster>

      {error && <Alert kind="error">{error}</Alert>}
      {statusMessage && <Alert kind={statusMessage.kind}>{statusMessage.text}</Alert>}

      {open && (
        <form onSubmit={handleInitiate} className={styles.formGrid}>
          <Field label="Billing name" value={name} onChange={setName} required />
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <Field label="Phone" value={phone} onChange={setPhone} required />
          <Field label="Address" value={address} onChange={setAddress} required />
          <Field label="City" value={city} onChange={setCity} required />
          <Field label="Postcode" value={postcode} onChange={setPostcode} required />

          <div className={styles.formActions}>
            <Button type="submit" disabled={busy}>
              {busy ? "Connecting gateway…" : `Pay ${formatMoney(appointment.feeAmount)}`}
            </Button>
          </div>
        </form>
      )}

      {payment && (
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <p className={styles.statusText}>
              Payment <code>{payment.transactionId}</code>:{" "}
              <Badge tone={payment.status === "SUCCEEDED" ? "success" : "warning"}>
                {formatStatus(payment.status)}
              </Badge>
            </p>
            {payment.gatewayUrl &&
              (payment.status === "PENDING" || payment.status === "INITIATED") && (
                <a
                  href={payment.gatewayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.gatewayLink}
                >
                  Open SSLCommerz portal
                </a>
              )}
          </div>

          {(payment.status === "PENDING" || payment.status === "INITIATED") && (
            <div className={styles.verifySection}>
              <Text tone="muted" size="sm" className={styles.verifyHelpText}>
                Returned from payment? Click below to verify your transaction with SSLCommerz and confirm your appointment.
              </Text>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void handleReconcile()}
              >
                {busy ? "Verifying with provider…" : "I completed payment - verify now"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
