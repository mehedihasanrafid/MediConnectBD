/**
 * Payments domain API functions.
 */

import type { Payment } from "../shared/types";
import { api } from "./client";

export interface PaymentCustomerInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
}

export const paymentsApi = {
  initiate: (appointmentId: string, customer: PaymentCustomerInput, idempotencyKey: string) =>
    api.post<Payment>(`/appointments/${appointmentId}/payments`, customer, {
      "Idempotency-Key": idempotencyKey,
    }),
  getById: (paymentId: string) => api.get<Payment>(`/payments/${paymentId}`),
  reconcile: (paymentId: string) => api.post<Payment>(`/payments/${paymentId}/reconcile`),
};
