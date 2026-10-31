/**
 * Doctor workspace overview: coordinates clinical command center, active consultation queue,
 * practice analytics, weekly schedule, and contextual patient inspector.
 */

import { useState } from "react";
import { Alert, EmptyState, Page, Spinner } from "../../shared/ui";
import { ClinicalStatusBar } from "./components/ClinicalStatusBar";
import { ContextualPatientDrawer } from "./components/ContextualPatientDrawer";
import { DoctorBreadcrumbs } from "./components/DoctorBreadcrumbs";
import { DoctorDashboardHeader } from "./components/DoctorDashboardHeader";
import { DoctorEarningsSection } from "./components/DoctorEarningsSection";
import { DoctorKpiCards } from "./components/DoctorKpiCards";
import { DoctorPracticeAnalytics } from "./components/DoctorPracticeAnalytics";
import { DoctorProfileSection } from "./components/DoctorProfileSection";
import { DoctorScheduleSection } from "./components/DoctorScheduleSection";
import { DoctorViewSwitcher, type DoctorDashboardTab } from "./components/DoctorViewSwitcher";
import { EmergencyLeaveModal } from "./components/EmergencyLeaveModal";
import { FastRxModal, type FastRxBundle } from "./components/FastRxModal";
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

  const [activeTab, setActiveTab] = useState<DoctorDashboardTab>("queue");
  const [inspectingPatientId, setInspectingPatientId] = useState<string | null>(null);
  const [selectedFastRxBundle, setSelectedFastRxBundle] = useState<FastRxBundle | null>(null);
  const [isEmergencyLeaveOpen, setIsEmergencyLeaveOpen] = useState(false);

  if (loading) return <Spinner label="Loading doctor clinical command center…" />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!profile) return <EmptyState>No doctor profile found.</EmptyState>;

  // Count active queue items
  const activeQueueCount = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  ).length;

  const tabLabels: Record<DoctorDashboardTab, string> = {
    queue: "Today's Patient Queue",
    analytics: "Practice Analytics & Revenue",
    schedule: "Weekly Schedule & Chambers",
  };

  return (
    <Page>
      <div className={styles.dashboardContainer}>
        {/* 1. Desktop Breadcrumbs Bar & Realtime Dhaka Clock */}
        <DoctorBreadcrumbs activeTabLabel={tabLabels[activeTab]} />

        {/* 2. Executive Doctor Hero Header */}
        <DoctorDashboardHeader
          bmdcNumber={profile.bmdcNumber}
          degrees={profile.degrees}
          experienceYears={profile.experienceYears}
          specialties={profile.specialties}
          todayAppointmentsCount={appointments.length}
        />

        {/* 3. Executive KPI Metric Cards */}
        <DoctorKpiCards
          appointments={appointments}
          earnings={earnings}
          prescriptions={prescriptions}
        />

        {/* 4. Desktop View Switcher (3 Workspace Tabs) */}
        <DoctorViewSwitcher
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          activeQueueCount={activeQueueCount}
        />

        {/* 5. Tab Content: Symmetric 2-Wing Canvas */}
        <div className={styles.tabContentWrapper}>
          {/* TAB 1: Today's Queue (Active Clinical Intake) */}
          {activeTab === "queue" && (
            <div className={styles.twoWingGrid}>
              <div className={styles.leftWing}>
                <TodayPatientRadar
                  appointments={appointments}
                  onInspectPatientHistory={setInspectingPatientId}
                  onAppointmentUpdated={loadDashboard}
                />
              </div>

              <div className={styles.rightWing}>
                <QuickPracticeTools
                  onSelectFastRxBundle={setSelectedFastRxBundle}
                  onOpenEmergencyLeave={() => setIsEmergencyLeaveOpen(true)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Practice Analytics & Financials */}
          {activeTab === "analytics" && (
            <div className={styles.twoWingGrid}>
              <div className={styles.leftWing}>
                <DoctorPracticeAnalytics
                  appointments={appointments}
                  earnings={earnings}
                />
              </div>

              <div className={styles.rightWing}>
                <DoctorEarningsSection earnings={earnings} />
              </div>
            </div>
          )}

          {/* TAB 3: Weekly Schedule & Profile Setup */}
          {activeTab === "schedule" && (
            <div className={styles.twoWingGrid}>
              <div className={styles.leftWing}>
                <DoctorScheduleSection schedule={schedule} onScheduleChanged={loadDashboard} />
              </div>

              <div className={styles.rightWing}>
                <DoctorProfileSection
                  profile={profile}
                  allSpecialties={specialties}
                  onProfileUpdated={setProfile}
                />
              </div>
            </div>
          )}
        </div>

        {/* 6. Contextual Patient Inspector (Slide-out Right Drawer) */}
        <ContextualPatientDrawer
          patientProfileId={inspectingPatientId}
          onClose={() => setInspectingPatientId(null)}
        />

        {/* 7. Dialog Modals */}
        <FastRxModal
          bundle={selectedFastRxBundle}
          onClose={() => setSelectedFastRxBundle(null)}
        />

        <EmergencyLeaveModal
          isOpen={isEmergencyLeaveOpen}
          onClose={() => setIsEmergencyLeaveOpen(false)}
          onScheduleChanged={loadDashboard}
        />

        {/* 8. Docked Desktop Clinical Status Bar */}
        <ClinicalStatusBar bmdcNumber={profile.bmdcNumber} />
      </div>
    </Page>
  );
}
