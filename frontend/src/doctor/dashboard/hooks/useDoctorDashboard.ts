import { useCallback, useEffect, useRef, useState } from "react";

import { doctorsApi } from "../../../api/doctors";
import { prescriptionsApi } from "../../../api/prescriptions";
import type {
  DoctorAppointment,
  DoctorEarningsSummary,
  Prescription,
  Specialty,
} from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";
import type { ScheduleOverview } from "../components/DoctorScheduleSection";
import type { DoctorProfileDetails } from "../types/doctorDashboard.types";

/**
 * Custom hook owning doctor dashboard profile, schedule, earnings,
 * appointments queue, prescriptions, and specialties loading.
 *
 * Implements resilient multi-stage loading:
 * 1. Fetches doctor profile first to verify identity and approval status.
 * 2. Only calls approved-only endpoints (e.g. GET /doctors/me/schedule) if applicationStatus === "APPROVED",
 *    preventing 403 DOCTOR_NOT_APPROVED errors from crashing the dashboard for DRAFT, PENDING_REVIEW,
 *    or REJECTED doctors.
 * 3. Loads secondary domain resources in parallel with independent failure isolation.
 */
export function useDoctorDashboard() {
  const [profile, setProfile] = useState<DoctorProfileDetails | null>(null);
  const [schedule, setSchedule] = useState<ScheduleOverview | null>(null);
  const [earnings, setEarnings] = useState<DoctorEarningsSummary | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active fetch cycle tracking for race condition & StrictMode safety
  const activeCycleRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    const cycleId = ++activeCycleRef.current;
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch doctor profile and verification status first
      const profileResult = await doctorsApi.getMyProfile<DoctorProfileDetails>();

      // Discard if a newer fetch cycle started or component unmounted
      if (cycleId !== activeCycleRef.current) return;
      setProfile(profileResult);

      // Step 2: Fetch specialties catalog (public; failure should never abort dashboard)
      const specialtiesPromise = doctorsApi
        .listSpecialties()
        .then((res) => {
          if (cycleId === activeCycleRef.current) {
            setSpecialties(res.items);
          }
        })
        .catch(() => {
          if (cycleId === activeCycleRef.current) {
            setSpecialties([]);
          }
        });

      // Step 3: Check approval status before invoking approved-only endpoints
      const isApproved = profileResult.applicationStatus === "APPROVED";

      if (isApproved) {
        // Step 4a: Approved doctor: load operational resources with independent failure isolation
        await Promise.allSettled([
          specialtiesPromise,
          doctorsApi
            .getMySchedule<ScheduleOverview>()
            .then((res) => {
              if (cycleId === activeCycleRef.current) {
                setSchedule(res);
              }
            })
            .catch(() => {
              if (cycleId === activeCycleRef.current) {
                setSchedule(null);
              }
            }),
          doctorsApi
            .getMyEarnings()
            .then((res) => {
              if (cycleId === activeCycleRef.current) {
                setEarnings(res);
              }
            })
            .catch(() => {
              if (cycleId === activeCycleRef.current) {
                setEarnings(null);
              }
            }),
          doctorsApi
            .listMyAppointments()
            .then((res) => {
              if (cycleId === activeCycleRef.current) {
                setAppointments(res.items);
              }
            })
            .catch(() => {
              if (cycleId === activeCycleRef.current) {
                setAppointments([]);
              }
            }),
          prescriptionsApi
            .listDoctorPrescriptions()
            .then((res) => {
              if (cycleId === activeCycleRef.current) {
                setPrescriptions(res.items);
              }
            })
            .catch(() => {
              if (cycleId === activeCycleRef.current) {
                setPrescriptions([]);
              }
            }),
        ]);
      } else {
        // Step 4b: Unapproved doctor (DRAFT, PENDING_REVIEW, REJECTED)
        // Explicitly clear approved-only data; do NOT call getMySchedule (returns 403 DOCTOR_NOT_APPROVED)
        if (cycleId === activeCycleRef.current) {
          setSchedule(null);
          setEarnings(null);
          setAppointments([]);
          setPrescriptions([]);
        }
        await specialtiesPromise;
      }
    } catch (caught) {
      if (cycleId === activeCycleRef.current) {
        const message = getErrorMessage(caught, "Could not load your doctor profile.");
        setError(message);
      }
    } finally {
      if (cycleId === activeCycleRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    return () => {
      // Invalidate pending cycle on unmount
      activeCycleRef.current++;
    };
  }, [loadDashboard]);

  const isApproved = profile?.applicationStatus === "APPROVED";

  return {
    profile,
    setProfile,
    schedule,
    earnings,
    specialties,
    appointments,
    prescriptions,
    loading,
    error,
    isApproved,
    loadDashboard,
    retry: loadDashboard,
  };
}
