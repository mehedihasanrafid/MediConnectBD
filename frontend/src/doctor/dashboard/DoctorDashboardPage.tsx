/**
 * Doctor workspace overview: coordinates clinical profile editing, application submission,
 * weekly schedule/time-off management, and quick navigation to the appointment queue & prescriptions.
 */

import { useState } from "react";
import { Alert, EmptyState, Page, Spinner } from "../../shared/ui";
import { DoctorDashboardHeader } from "./components/DoctorDashboardHeader";
import { DoctorEarningsSection } from "./components/DoctorEarningsSection";
import { DoctorKpiCards } from "./components/DoctorKpiCards";
import { DoctorPracticeAnalytics } from "./components/DoctorPracticeAnalytics";
import { DoctorProfileSection } from "./components/DoctorProfileSection";
import { DoctorScheduleSection } from "./components/DoctorScheduleSection";
import { EmergencyLeaveModal } from "./components/EmergencyLeaveModal";
import { FastRxModal } from "./components/FastRxModal";
import type { FastRxBundle } from "./components/FastRxModal";
import { PatientHistoryPanel } from "./components/PatientHistoryPanel";
import { QuickPracticeTools } from "./components/QuickPracticeTools";
import { TodayPatientRadar } from "./components/TodayPatientRadar";
import { useDoctorDashboard } from "./hooks/useDoctorDashboard";
import styles from "./DoctorDashboardPage.module.css";

export function DoctorDashboardPage() {
  const {
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
  } = useDoctorDashboard();

  const [inspectingPatientId, setInspectingPatientId] = useState<string | null>(null);
  const [selectedFastRxBundle, setSelectedFastRxBundle] = useState<FastRxBundle | null>(null);
  const [isEmergencyLeaveOpen, setIsEmergencyLeaveOpen] = useState(false);

  if (loading) return <Spinner label="Loading doctor clinical command center…" />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!profile) return <EmptyState>No doctor profile found.</EmptyState>;

  return (
    <Page>
      {/* 1. Executive Doctor Hero Header */}
      <DoctorDashboardHeader
        bmdcNumber={profile.bmdcNumber}
        degrees={profile.degrees}
        experienceYears={profile.experienceYears}
        specialties={profile.specialties}
        todayAppointmentsCount={appointments.length}
      />

      {/* 2. Executive KPI Stat Cards */}
      <DoctorKpiCards
        appointments={appointments}
        earnings={earnings}
        prescriptions={prescriptions}
      />

      {/* 3. Balanced 2-Column Clinical Command Center Grid */}
      <div className={styles.dashboardGrid}>
        {/* Left Clinical Column (Queue, Patient Radar, Analytics, Schedule & Profile) */}
        <div className={styles.leftColumn}>
          {inspectingPatientId && (
            <div className={styles.historyDrawerWrapper}>
              <PatientHistoryPanel
                patientProfileId={inspectingPatientId}
                onClose={() => setInspectingPatientId(null)}
              />
            </div>
          )}

          <TodayPatientRadar
            appointments={appointments}
            onInspectPatientHistory={setInspectingPatientId}
            onAppointmentUpdated={loadDashboard}
          />

          <DoctorPracticeAnalytics
            appointments={appointments}
            earnings={earnings}
          />

          <DoctorScheduleSection schedule={schedule} onScheduleChanged={loadDashboard} />

          <DoctorProfileSection
            profile={profile}
            allSpecialties={specialties}
            onProfileUpdated={setProfile}
          />
        </div>

        {/* Right Operations Column (Practice Tools, Earnings & Settlement) */}
        <div className={styles.rightColumn}>
          <QuickPracticeTools
            onSelectFastRxBundle={setSelectedFastRxBundle}
            onOpenEmergencyLeave={() => setIsEmergencyLeaveOpen(true)}
          />

          <DoctorEarningsSection earnings={earnings} />
        </div>
      </div>

      {/* 4. Interactive Modals */}
      <FastRxModal
        bundle={selectedFastRxBundle}
        onClose={() => setSelectedFastRxBundle(null)}
      />

      <EmergencyLeaveModal
        isOpen={isEmergencyLeaveOpen}
        onClose={() => setIsEmergencyLeaveOpen(false)}
        onScheduleChanged={loadDashboard}
      />
    </Page>
  );
}
