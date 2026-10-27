import { useCallback, useEffect, useState } from "react";

import { doctorsApi } from "../../../api/doctors";
import type { DoctorEarningsSummary, Specialty } from "../../../shared/types";
import type { ScheduleOverview } from "../components/DoctorScheduleSection";
import type { DoctorProfileDetails } from "../types/doctorDashboard.types";

/**
 * Custom hook owning doctor dashboard profile, schedule, earnings, and specialties loading.
 */
export function useDoctorDashboard() {
  const [profile, setProfile] = useState<DoctorProfileDetails | null>(null);
  const [schedule, setSchedule] = useState<ScheduleOverview | null>(null);
  const [earnings, setEarnings] = useState<DoctorEarningsSummary | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [profileResult, scheduleResult, earningsResult, specialtiesResult] = await Promise.all([
        doctorsApi.getMyProfile<DoctorProfileDetails>(),
        doctorsApi.getMySchedule<ScheduleOverview>(),
        doctorsApi.getMyEarnings().catch(() => null),
        doctorsApi.listSpecialties().catch(() => ({ items: [] as Specialty[] })),
      ]);
      setProfile(profileResult);
      setSchedule(scheduleResult);
      setEarnings(earningsResult);
      setSpecialties(specialtiesResult.items);
    } catch {
      setError("Could not load your doctor profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      doctorsApi.getMyProfile<DoctorProfileDetails>(),
      doctorsApi.getMySchedule<ScheduleOverview>(),
      doctorsApi.getMyEarnings().catch(() => null),
      doctorsApi.listSpecialties().catch(() => ({ items: [] as Specialty[] })),
    ])
      .then(([profileResult, scheduleResult, earningsResult, specialtiesResult]) => {
        if (cancelled) return;
        setProfile(profileResult);
        setSchedule(scheduleResult);
        setEarnings(earningsResult);
        setSpecialties(specialtiesResult.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your doctor profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    profile,
    setProfile,
    schedule,
    earnings,
    specialties,
    loading,
    error,
    loadDashboard,
  };
}
