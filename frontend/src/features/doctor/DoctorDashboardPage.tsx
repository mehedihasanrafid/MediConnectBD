/**
 * Doctor workspace overview: coordinates clinical profile editing, application submission,
 * weekly schedule/time-off management, and quick navigation to the appointment queue & prescriptions.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doctorsApi } from "../../api/doctors";
import { Alert, EmptyState, Spinner } from "../../components/ui";
import type { Specialty } from "../../shared/types";
import { DoctorProfileSection, type DoctorProfileDetails } from "./DoctorProfileSection";
import { DoctorScheduleSection, type ScheduleOverview } from "./DoctorScheduleSection";

export function DoctorDashboardPage() {
  const [profile, setProfile] = useState<DoctorProfileDetails | null>(null);
  const [schedule, setSchedule] = useState<ScheduleOverview | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [profileResult, scheduleResult, specialtiesResult] = await Promise.all([
        doctorsApi.getMyProfile<DoctorProfileDetails>(),
        doctorsApi.getMySchedule<ScheduleOverview>(),
        doctorsApi.listSpecialties().catch(() => ({ items: [] as Specialty[] })),
      ]);
      setProfile(profileResult);
      setSchedule(scheduleResult);
      setSpecialties(specialtiesResult.items);
    } catch {
      setError("Could not load your doctor profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!profile) return <EmptyState>No doctor profile found.</EmptyState>;

  return (
    <div className="page">
      <header className="row space-between">
        <div>
          <h1>Doctor dashboard</h1>
          <p className="muted">BMDC {profile.bmdcNumber}</p>
        </div>
        <div className="row">
          <Link className="btn btn-primary" to="/doctor/appointments">
            Patient appointment queue
          </Link>
          <Link className="btn btn-secondary" to="/doctor/prescriptions">
            Issued prescriptions
          </Link>
        </div>
      </header>

      <DoctorProfileSection
        profile={profile}
        allSpecialties={specialties}
        onProfileUpdated={setProfile}
      />

      <DoctorScheduleSection schedule={schedule} onScheduleChanged={loadDashboard} />
    </div>
  );
}
