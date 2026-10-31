/**
 * Online payment checkout & reconciliation panel for video consultations in PENDING_PAYMENT state.
 * Sends a stable Idempotency-Key per appointment so retries reuse the same payment record.
 * Includes an interactive Bangladeshi Payment Gateway Sandbox Simulator (bKash / Nagad / Rocket / Cards).
 */

import { useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck, Smartphone, XCircle } from "lucide-react";

import { paymentsApi } from "../../../../api/payments";
import { Alert, Badge, Button, Cluster, Field, Text } from "../../../../shared/ui";
import { useAuth } from "../../../../features/auth/AuthContext";
import type { Appointment, Payment } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatMoney, formatStatus } from "../../../../shared/utils/format";
import styles from "./PaymentPanel.module.css";

type PaymentMethod = "BKASH" | "NAGAD" | "ROCKET" | "CARD";

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

  // Simulator method & test inputs
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("BKASH");
  const [simWalletNumber, setSimWalletNumber] = useState("01700123456");
  const [simOtp, setSimOtp] = useState("123456");
  const [simPin, setSimPin] = useState("12345");
  const [simCardNumber, setSimCardNumber] = useState("4242 4242 4242 4242");
  const [simCardExpiry, setSimCardExpiry] = useState("12/28");
  const [simCardCvc, setSimCardCvc] = useState("123");

  const idempotencyKey = `checkout_${appointment.id.replaceAll("-", "")}`;

  async function handleInitiate(event?: React.FormEvent) {
    if (event) event.preventDefault();
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

  async function handleReconcile(customSuccessText?: string) {
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
          text:
            customSuccessText ||
            "Payment verified successfully! Your consultation slot is confirmed.",
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

  async function handleSimulateSuccess() {
    if (!payment) {
      // First initiate if not yet initiated
      await handleInitiate();
    }
    const methodName =
      selectedMethod === "BKASH"
        ? "bKash"
        : selectedMethod === "NAGAD"
        ? "Nagad"
        : selectedMethod === "ROCKET"
        ? "Rocket"
        : "Card";
    await handleReconcile(
      `Payment verified successfully via ${methodName}! Your consultation slot is confirmed.`,
    );
  }

  function handleSimulateFail() {
    setError(
      "Simulated Payment Failed: The transaction was declined by the mobile provider or issuing bank (Insufficient balance or authentication timeout). You can try again.",
    );
    setStatusMessage(null);
  }

  function handleSimulateCancel() {
    setStatusMessage({
      kind: "info",
      text: "Payment checkout cancelled by user. Your booking hold remains active until expiration.",
    });
    setError(null);
  }

  function autoFillDemo(method: PaymentMethod) {
    setSelectedMethod(method);
    if (method === "BKASH") {
      setSimWalletNumber("01700123456");
      setSimOtp("123456");
      setSimPin("12345");
    } else if (method === "NAGAD") {
      setSimWalletNumber("01800654321");
      setSimOtp("654321");
      setSimPin("1234");
    } else if (method === "ROCKET") {
      setSimWalletNumber("019009876543");
      setSimOtp("987654");
      setSimPin("1234");
    } else {
      setSimCardNumber("4242 4242 4242 4242");
      setSimCardExpiry("12/28");
      setSimCardCvc("123");
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

      {/* =========================================================================
       * 🇧🇩 BANGLADESHI PAYMENT GATEWAY SANDBOX SIMULATOR
       * ========================================================================= */}
      {open && (payment?.status !== "SUCCEEDED") && (
        <div className={styles.simulatorCard}>
          <div className={styles.simulatorHeader}>
            <h4 className={styles.simulatorTitle}>
              <ShieldCheck size={18} />
              <span>Bangladeshi Payment Gateway Simulator</span>
            </h4>
            <Badge tone="warning">🧪 Sandbox Demo Mode</Badge>
          </div>

          <div style={{ marginBottom: "var(--space-3)" }}>
            <Text tone="muted" size="sm">
              Select your preferred mobile wallet or card below to test the instant consultation
              confirmation flow:
            </Text>
          </div>

          {/* Payment Method Tabs */}
          <div className={styles.paymentTabs} role="tablist" aria-label="Payment methods">
            <button
              type="button"
              className={`${styles.tabButton} ${selectedMethod === "BKASH" ? styles.tabButtonActive : ""}`}
              onClick={() => autoFillDemo("BKASH")}
            >
              <Smartphone size={16} />
              <span>🌸 bKash (বিকাশ)</span>
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${selectedMethod === "NAGAD" ? styles.tabButtonActive : ""}`}
              onClick={() => autoFillDemo("NAGAD")}
            >
              <Smartphone size={16} />
              <span>🍊 Nagad (নগদ)</span>
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${selectedMethod === "ROCKET" ? styles.tabButtonActive : ""}`}
              onClick={() => autoFillDemo("ROCKET")}
            >
              <Smartphone size={16} />
              <span>🚀 Rocket (রকেট)</span>
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${selectedMethod === "CARD" ? styles.tabButtonActive : ""}`}
              onClick={() => autoFillDemo("CARD")}
            >
              <CreditCard size={16} />
              <span>💳 Visa / Mastercard</span>
            </button>
          </div>

          {/* Method Body */}
          <div className={styles.methodBody}>
            <div className={styles.methodHeader}>
              <span className={styles.methodName}>
                {selectedMethod === "BKASH" && "bKash Online Payment Sandbox"}
                {selectedMethod === "NAGAD" && "Nagad Direct Pay Sandbox"}
                {selectedMethod === "ROCKET" && "DBBL Rocket Payment Sandbox"}
                {selectedMethod === "CARD" && "Credit / Debit Card Gateway (SSLCommerz Demo)"}
              </span>
              <button
                type="button"
                className={styles.autoFillButton}
                onClick={() => autoFillDemo(selectedMethod)}
              >
                Reset demo credentials
              </button>
            </div>

            {selectedMethod !== "CARD" ? (
              <div className={styles.simulatorGrid}>
                <Field
                  label={`${selectedMethod === "BKASH" ? "bKash" : selectedMethod === "NAGAD" ? "Nagad" : "Rocket"} Number`}
                  value={simWalletNumber}
                  onChange={setSimWalletNumber}
                />
                <Field label="Demo OTP Code" value={simOtp} onChange={setSimOtp} />
                <Field label="Wallet PIN" value={simPin} onChange={setSimPin} type="password" />
              </div>
            ) : (
              <div className={styles.simulatorGrid}>
                <Field label="Test Card Number" value={simCardNumber} onChange={setSimCardNumber} />
                <Field label="Expiry (MM/YY)" value={simCardExpiry} onChange={setSimCardExpiry} />
                <Field label="CVC" value={simCardCvc} onChange={setSimCardCvc} type="password" />
              </div>
            )}

            {/* Simulation Action Triggers */}
            <div className={styles.simulationActions}>
              <span className={styles.actionLabel}>Test Simulation Triggers</span>
              <div className={styles.actionButtonGroup}>
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => void handleSimulateSuccess()}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {busy
                      ? "Verifying payment…"
                      : `Pay ${formatMoney(appointment.feeAmount)} (Simulate Success)`}
                  </span>
                </Button>

                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={handleSimulateFail}
                >
                  <XCircle size={16} />
                  <span>Simulate Failed (Declined)</span>
                </Button>

                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={handleSimulateCancel}
                >
                  <span>Simulate Cancel</span>
                </Button>
              </div>
            </div>
          </div>

          <div className={styles.sandboxNotice}>
            <ShieldCheck size={14} />
            <span>
              Demo Sandbox Mode: No real funds are deducted. Simulates full SSLCommerz WebRTC
              handshake and slot booking confirmation.
            </span>
          </div>
        </div>
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
