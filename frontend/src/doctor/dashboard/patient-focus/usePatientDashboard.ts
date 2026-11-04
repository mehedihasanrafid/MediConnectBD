import { useCallback, useEffect, useRef, useState } from "react";
import { doctorsApi } from "../../../api/doctors";
import type { DoctorAppointment } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";
import type { DoctorProfileDetails } from "../types/doctorDashboard.types";

/** Load only the resources used by the patient-focused dashboard. */
export function usePatientDashboard() {
  const [profile, setProfile] = useState<DoctorProfileDetails | null>(null);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [hasAppointments, setHasAppointments] = useState(false);
  const cycle = useRef(0);

  const reload = useCallback(async () => {
    const current = ++cycle.current;
    setRefreshing(true);
    setProfileError(null);
    setAppointmentsError(null);
    try {
      const doctor = await doctorsApi.getMyProfile<DoctorProfileDetails>();
      if (current !== cycle.current) return;
      setProfile(doctor);
      if (doctor.applicationStatus !== "APPROVED") {
        setAppointments([]);
        setHasAppointments(false);
        return;
      }
      try {
        const result = await doctorsApi.listMyAppointments();
        if (current !== cycle.current) return;
        setAppointments(result.items);
        setHasAppointments(true);
      } catch (caught) {
        if (current === cycle.current) setAppointmentsError(getErrorMessage(caught, "Could not load today's patients."));
      }
    } catch (caught) {
      if (current === cycle.current) setProfileError(getErrorMessage(caught, "Could not load your doctor profile."));
    } finally {
      if (current === cycle.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    void reload();
    const active = cycle;
    return () => { active.current++; };
  }, [reload]);

  return { profile, appointments, loading, refreshing, profileError, appointmentsError, hasAppointments, reload };
}
