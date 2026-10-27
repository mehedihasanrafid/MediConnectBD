/**
 * Doctor workspace overview: coordinates clinical profile editing, application submission,
 * weekly schedule/time-off management, and quick navigation to the appointment queue & prescriptions.
 */

import { Alert, EmptyState, Spinner } from "../../components/ui";
import { DoctorDashboardHeader } from "./components/DoctorDashboardHeader";
import { DoctorEarningsSection } from "./components/DoctorEarningsSection";
import { DoctorProfileSection } from "./components/DoctorProfileSection";
import { DoctorScheduleSection } from "./components/DoctorScheduleSection";
import styles from "./DoctorDashboardPage.module.css";
import { useDoctorDashboard } from "./hooks/useDoctorDashboard";

export function DoctorDashboardPage() {
  const {
    profile,
    setProfile,
    schedule,
    earnings,
    specialties,
    loading,
    error,
    loadDashboard,
  } = useDoctorDashboard();

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!profile) return <EmptyState>No doctor profile found.</EmptyState>;

  return (
    <div className={`page ${styles.page}`}>
      <DoctorDashboardHeader bmdcNumber={profile.bmdcNumber} />

      <DoctorEarningsSection earnings={earnings} />

      <DoctorProfileSection
        profile={profile}
        allSpecialties={specialties}
        onProfileUpdated={setProfile}
      />

      <DoctorScheduleSection schedule={schedule} onScheduleChanged={loadDashboard} />
    </div>
  );
}
