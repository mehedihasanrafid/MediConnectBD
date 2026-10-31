import { useCallback, useEffect, useState } from "react";

import { doctorsApi } from "../../../api/doctors";
import { prescriptionsApi } from "../../../api/prescriptions";
import type {
  DoctorAppointment,
  DoctorEarningsSummary,
  Prescription,
  Specialty,
} from "../../../shared/types";
import type { ScheduleOverview } from "../components/DoctorScheduleSection";
import type { DoctorProfileDetails } from "../types/doctorDashboard.types";

/**
 * Custom hook owning doctor dashboard profile, schedule, earnings,
 * appointments queue, prescriptions, and specialties loading.
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

  const loadDashboard = useCallback(async () => {
    try {
      const [
        profileResult,
        scheduleResult,
        earningsResult,
        specialtiesResult,
        appointmentsResult,
        prescriptionsResult,
      ] = await Promise.all([
        doctorsApi.getMyProfile<DoctorProfileDetails>(),
        doctorsApi.getMySchedule<ScheduleOverview>(),
        doctorsApi.getMyEarnings().catch(() => null),
        doctorsApi.listSpecialties().catch(() => ({ items: [] as Specialty[] })),
        doctorsApi.listMyAppointments().catch(() => ({ items: [] as DoctorAppointment[] })),
        prescriptionsApi.listDoctorPrescriptions().catch(() => ({ items: [] as Prescription[] })),
      ]);

      setProfile(profileResult);
      setSchedule(scheduleResult);
      setEarnings(earningsResult);
      setSpecialties(specialtiesResult.items);
      setAppointments(appointmentsResult.items);
      setPrescriptions(prescriptionsResult.items);
    } catch {
      setError("Could not load your doctor profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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
    loadDashboard,
  };
}
