import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Appointment, Payment } from "../../../shared/types";
import { PaymentPanel } from "../components/PaymentPanel";

vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      firstName: "Test",
      lastName: "Patient",
      email: "patient@example.com",
    },
  }),
}));

describe("PaymentPanel regression test", () => {
  const dummyAppointment: Appointment = {
    id: "appt-1234-5678",
    patientProfileId: "p1",
    doctorId: "d1",
    holdId: "h1",
    status: "PENDING_PAYMENT",
    scheduledStartAt: "2026-11-01T10:00:00.000Z",
    scheduledEndAt: "2026-11-01T10:20:00.000Z",
    mode: "VIDEO",
    feeAmount: 800,
    paymentRequired: true,
    paymentReference: null,
    cancellationReason: null,
    createdAt: "2026-10-27T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z",
    slot: {
      id: "s1",
      doctorId: "d1",
      startAt: "2026-11-01T10:00:00.000Z",
      endAt: "2026-11-01T10:20:00.000Z",
      mode: "VIDEO",
      feeAmount: 800,
      chamber: null,
    },
  };

  it("renders the 'Open SSLCommerz portal' checkout link for a PENDING payment with a gatewayUrl", () => {
    const pendingPayment: Payment = {
      id: "pay-100",
      appointmentId: dummyAppointment.id,
      patientProfileId: "p1",
      transactionId: "TX12345678",
      amount: "800.00",
      currency: "BDT",
      status: "PENDING",
      gatewayUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/testbox",
      expiresAt: "2026-10-27T10:30:00.000Z",
    };

    const html = renderToString(
      <PaymentPanel
        appointment={dummyAppointment}
        initialPayment={pendingPayment}
        onPaymentUpdated={() => {}}
      />,
    );

    // The checkout link must be present for a PENDING payment with a gateway URL
    expect(html).toContain("Open SSLCommerz portal");
    expect(html).toContain('href="https://sandbox.sslcommerz.com/gwprocess/v4/testbox"');
  });

  it("does not render the checkout link when gatewayUrl is missing", () => {
    const paymentWithoutUrl: Payment = {
      id: "pay-101",
      appointmentId: dummyAppointment.id,
      patientProfileId: "p1",
      transactionId: "TX12345679",
      amount: "800.00",
      currency: "BDT",
      status: "PENDING",
      gatewayUrl: null,
      expiresAt: "2026-10-27T10:30:00.000Z",
    };

    const html = renderToString(
      <PaymentPanel
        appointment={dummyAppointment}
        initialPayment={paymentWithoutUrl}
        onPaymentUpdated={() => {}}
      />,
    );

    expect(html).not.toContain("Open SSLCommerz portal");
  });

  it("renders the 'I completed payment - verify now' action for a PENDING payment", () => {
    const pendingPayment: Payment = {
      id: "pay-102",
      appointmentId: dummyAppointment.id,
      patientProfileId: "p1",
      transactionId: "TX12345680",
      amount: "800.00",
      currency: "BDT",
      status: "PENDING",
      gatewayUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/testbox",
      expiresAt: "2026-10-27T10:30:00.000Z",
    };

    const html = renderToString(
      <PaymentPanel
        appointment={dummyAppointment}
        initialPayment={pendingPayment}
        onPaymentUpdated={() => {}}
      />,
    );

    expect(html).toContain("I completed payment - verify now");
  });

  it("does not render the 'I completed payment - verify now' action when payment has SUCCEEDED", () => {
    const succeededPayment: Payment = {
      id: "pay-103",
      appointmentId: dummyAppointment.id,
      patientProfileId: "p1",
      transactionId: "TX12345681",
      amount: "800.00",
      currency: "BDT",
      status: "SUCCEEDED",
      gatewayUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/testbox",
      expiresAt: "2026-10-27T10:30:00.000Z",
    };

    const html = renderToString(
      <PaymentPanel
        appointment={dummyAppointment}
        initialPayment={succeededPayment}
        onPaymentUpdated={() => {}}
      />,
    );

    expect(html).not.toContain("I completed payment - verify now");
  });
});
