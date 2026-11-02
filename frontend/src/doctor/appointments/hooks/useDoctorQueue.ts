import { useCallback, useEffect, useState } from "react";

import { appointmentsApi } from "../../../api/appointments";
import { doctorsApi } from "../../../api/doctors";
import { prescriptionsApi } from "../../../api/prescriptions";
import type { DoctorAppointment, Prescription } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";

/**
 * Custom hook managing the doctor's appointment queue, status transitions, and prescription map.
 */
export function useDoctorQueue() {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [prescriptionsByAppt, setPrescriptionsByAppt] = useState<Record<string, Prescription>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const [apptsRes, rxRes] = await Promise.all([
        doctorsApi.listMyAppointments(),
        prescriptionsApi.listDoctorPrescriptions().catch(() => ({ items: [] as Prescription[] })),
      ]);
      setAppointments(apptsRes.items);
      const map: Record<string, Prescription> = {};
      for (const rx of rxRes.items) {
        map[rx.appointmentId] = rx;
      }
      setPrescriptionsByAppt(map);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load your appointment queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      doctorsApi.listMyAppointments(),
      prescriptionsApi.listDoctorPrescriptions().catch(() => ({ items: [] as Prescription[] })),
    ])
      .then(([apptsRes, rxRes]) => {
        if (cancelled) return;
        setAppointments(apptsRes.items);
        const map: Record<string, Prescription> = {};
        for (const rx of rxRes.items) {
          map[rx.appointmentId] = rx;
        }
        setPrescriptionsByAppt(map);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load your appointment queue."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTransition = useCallback(
    async (
      appointmentId: string,
      action: "complete" | "no-show" | "cancel",
      reason?: string,
    ) => {
      setBusyId(appointmentId);
      setError(null);
      setNotice(null);
      try {
        if (action === "complete") {
          await appointmentsApi.completeAppointment(appointmentId);
          setNotice("Appointment marked as completed. You can now issue a prescription.");
        } else if (action === "no-show") {
          await appointmentsApi.markNoShow(appointmentId);
          setNotice("Appointment marked as no-show.");
        } else {
          await appointmentsApi.cancelAppointment(appointmentId, reason || "Cancelled by doctor");
          setNotice("Appointment cancelled (100% patient refund policy applied if paid).");
        }
        await loadQueue();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not update appointment status."));
      } finally {
        setBusyId(null);
      }
    },
    [loadQueue],
  );

  const registerCreatedPrescription = useCallback(
    (appointmentId: string, created: Prescription) => {
      setPrescriptionsByAppt((prev) => ({ ...prev, [appointmentId]: created }));
      setNotice(`Prescription issued (verification code: ${created.verificationCode}).`);
    },
    [],
  );

  return {
    appointments,
    prescriptionsByAppt,
    loading,
    error,
    notice,
    busyId,
    handleTransition,
    registerCreatedPrescription,
    reload: loadQueue,
  };
}
