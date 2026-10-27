import { useCallback, useEffect, useState } from "react";

import { adminApi } from "../../../api/admin";
import { appointmentsApi } from "../../../api/appointments";
import { getErrorMessage } from "../../../shared/utils/apiError";

export interface AdminAppointmentRow {
  id: string;
  patientProfileId: string;
  doctorId: string;
  status: string;
  mode: string;
  scheduledStartAt: string;
  feeAmount: string | number;
  createdAt: string;
}

export interface AdminPaymentRow {
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

export interface AdminRefundRow {
  id: string;
  paymentId: string;
  refundTransactionId: string;
  amount: string | number;
  status: string;
  reason: string;
  createdAt: string;
}

/**
 * Custom hook managing admin operations: appointments, payments (10% commission split), and refunds.
 */
export function useAdminOperations() {
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
    let cancelled = false;
    void Promise.all([
      adminApi.listAppointments<{ items: AdminAppointmentRow[] }>("limit=30"),
      adminApi.listPayments<{ items: AdminPaymentRow[] }>("limit=30"),
      adminApi.listRefunds<{ items: AdminRefundRow[] }>("limit=30"),
    ])
      .then(([apptsRes, payRes, refRes]) => {
        if (cancelled) return;
        setAppointments(apptsRes.items);
        setPayments(payRes.items);
        setRefunds(refRes.items);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load operational records."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdminCancelAppointment = useCallback(
    async (appointmentId: string) => {
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
    },
    [loadAll],
  );

  const handleSubmitRefund = useCallback(
    async (refundId: string) => {
      setBusyId(refundId);
      setError(null);
      setNotice(null);
      try {
        await adminApi.submitRefund(refundId);
        setNotice("Refund recorded for manual processing.");
        await loadAll();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not record refund for manual processing."));
      } finally {
        setBusyId(null);
      }
    },
    [loadAll],
  );

  return {
    tab,
    setTab,
    appointments,
    payments,
    refunds,
    loading,
    busyId,
    error,
    notice,
    handleAdminCancelAppointment,
    handleSubmitRefund,
  };
}
