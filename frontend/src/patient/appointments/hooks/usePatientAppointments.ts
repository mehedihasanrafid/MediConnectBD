import { useCallback, useEffect, useState } from "react";

import { appointmentsApi } from "../../../api/appointments";
import { reviewsApi } from "../../../api/reviews";
import type { Appointment, CancellationOutcome, Review } from "../../../shared/types";
import { formatDhakaDateTime, formatMoney } from "../../../shared/utils/format";

/**
 * Custom hook managing the patient's appointments list, post-visit reviews, rescheduling, and cancellations.
 */
export function usePatientAppointments() {
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
    let cancelled = false;
    void Promise.all([
      appointmentsApi.listMyAppointments(),
      reviewsApi.listMyReviews().catch(() => ({ items: [] as Review[] })),
    ])
      .then(([appointmentsRes, reviewsRes]) => {
        if (cancelled) return;
        setAppointments(appointmentsRes.items);
        const map: Record<string, Review> = {};
        for (const rev of reviewsRes.items) {
          map[rev.appointmentId] = rev;
        }
        setReviewsByAppointment(map);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your appointments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceAppointment = useCallback((updated: Appointment) => {
    setAppointments((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }, []);

  const handleRescheduled = useCallback(
    (updated: Appointment) => {
      replaceAppointment(updated);
      setNotice(`Appointment rescheduled to ${formatDhakaDateTime(updated.scheduledStartAt)}.`);
    },
    [replaceAppointment],
  );

  const handleCancelled = useCallback(
    (outcome: CancellationOutcome) => {
      replaceAppointment(outcome.appointment);
      setNotice(
        outcome.refundId
          ? `Appointment cancelled. A refund of ${formatMoney(outcome.refundAmount)} has been requested.`
          : "Appointment cancelled.",
      );
    },
    [replaceAppointment],
  );

  const handleReviewCreated = useCallback((review: Review) => {
    setReviewsByAppointment((prev) => ({ ...prev, [review.appointmentId]: review }));
    setNotice("Thank you! Your review has been published.");
  }, []);

  return {
    appointments,
    reviewsByAppointment,
    loading,
    error,
    notice,
    loadAll,
    handleRescheduled,
    handleCancelled,
    handleReviewCreated,
  };
}
