import { useCallback, useEffect, useState } from "react";

import { appointmentsApi } from "../../../api/appointments";
import { api } from "../../../api/client";
import { doctorsApi } from "../../../api/doctors";
import { reviewsApi } from "../../../api/reviews";
import type {
  Appointment,
  AvailabilityResponse,
  AvailabilitySlot,
  FamilyMember,
  PublicDoctor,
  PublicUser,
  Review,
  SlotHold,
} from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";
import { isPatient } from "../../../shared/utils/roles";

/**
 * Custom hook managing public doctor profile, 7-day slot availability, 10-minute slot holds,
 * family-member booking, and review moderation.
 */
export function useDoctorDetail(
  doctorId: string,
  user: PublicUser | null,
  onRequireAuth: () => void,
) {
  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<SlotHold | null>(null);
  const [booking, setBooking] = useState<Appointment | null>(null);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>("");

  useEffect(() => {
    if (!isPatient(user)) return;
    let cancelled = false;
    void api
      .get<{ items: FamilyMember[] }>("/patients/me/family-members")
      .then((res) => {
        if (!cancelled) setFamilyMembers(res.items);
      })
      .catch(() => {
        if (!cancelled) setFamilyMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      doctorsApi.getPublicProfile(doctorId),
      doctorsApi.getAvailability(doctorId, 7),
      reviewsApi.listDoctorReviews(doctorId).catch(() => ({ items: [] as Review[] })),
    ])
      .then(([profile, slots, reviewsRes]) => {
        if (cancelled) return;
        setDoctor(profile);
        setAvailability(slots);
        setReviews(reviewsRes.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this doctor's availability.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const handleHold = useCallback(
    async (slot: AvailabilitySlot) => {
      if (!user) {
        onRequireAuth();
        return;
      }
      setBusySlotId(slot.id);
      setError(null);
      try {
        const created = await appointmentsApi.holdSlot(slot.id);
        setHold(created);
        setBooking(null);
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not hold this slot."));
      } finally {
        setBusySlotId(null);
      }
    },
    [user, onRequireAuth],
  );

  const handleBook = useCallback(async () => {
    if (!hold) return;
    setError(null);
    try {
      const appointment = await appointmentsApi.bookAppointment(
        hold.id,
        selectedFamilyMemberId || null,
      );
      setBooking(appointment);
      setHold(null);
      setSelectedFamilyMemberId("");
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not confirm booking."));
    }
  }, [hold, selectedFamilyMemberId]);

  const handleRelease = useCallback(async () => {
    if (!hold) return;
    try {
      await appointmentsApi.releaseHold(hold.id);
    } finally {
      setHold(null);
    }
  }, [hold]);

  const handleRemoveReview = useCallback(async (reviewId: string) => {
    try {
      await reviewsApi.removeAsAdmin(reviewId);
      setReviews((current) => current.filter((item) => item.id !== reviewId));
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not remove review."));
    }
  }, []);

  return {
    doctor,
    availability,
    reviews,
    loading,
    error,
    hold,
    booking,
    busySlotId,
    familyMembers,
    selectedFamilyMemberId,
    setSelectedFamilyMemberId,
    handleHold,
    handleBook,
    handleRelease,
    handleRemoveReview,
  };
}
