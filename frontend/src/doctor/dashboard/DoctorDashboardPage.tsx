/**
 * Doctor workspace overview: operational clinical command center, active consultation queue,
 * upcoming next appointment, practice status, schedule summary, and secondary deep-dive tooling.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../features/auth/AuthContext";
import type { DoctorAppointment } from "../../shared/types";
import { Alert, Button, EmptyState, Spinner } from "../../shared/ui";

import { ClinicalStatusBar } from "./components/ClinicalStatusBar";
import { ContextualPatientDrawer } from "./components/ContextualPatientDrawer";
import { DoctorEarningsSection } from "./components/DoctorEarningsSection";
import { DoctorPracticeAnalytics } from "./components/DoctorPracticeAnalytics";
import { DoctorProfileSection } from "./components/DoctorProfileSection";
import { DoctorScheduleSection } from "./components/DoctorScheduleSection";
import { DoctorViewSwitcher, type DoctorDashboardTab } from "./components/DoctorViewSwitcher";
import { DoctorWelcomeHeader } from "./components/DoctorWelcomeHeader";
import { EmergencyLeaveModal } from "./components/EmergencyLeaveModal";
import { FastRxModal, type FastRxBundle } from "./components/FastRxModal";
import { IssuePrescriptionModal } from "./components/IssuePrescriptionModal";
import { NextAppointmentCard } from "./components/NextAppointmentCard";
import { OperationalKpiCards } from "./components/OperationalKpiCards";
import { PracticeStatusWidget } from "./components/PracticeStatusWidget";
import { QuickPracticeTools } from "./components/QuickPracticeTools";
import { ScheduleSummaryWidget } from "./components/ScheduleSummaryWidget";
import { TodayPatientRadar } from "./components/TodayPatientRadar";
import { TodayQueuePreview } from "./components/TodayQueuePreview";
import { useDoctorDashboard } from "./hooks/useDoctorDashboard";
import styles from "./DoctorDashboardPage.module.css";

export function DoctorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
    isApproved,
    loadDashboard,
  } = useDoctorDashboard();

  // Determine initial tab from query string if provided
  const queryTab = searchParams.get("tab");
  const resolveTab = (): DoctorDashboardTab => {
    if (queryTab === "schedule" || queryTab === "profile") return "schedule";
    if (queryTab === "analytics" || queryTab === "earnings") return "analytics";
    return "queue";
  };

  const [activeTab, setActiveTab] = useState<DoctorDashboardTab>(resolveTab);

  // Sync state if query param changes externally
  useEffect(() => {
    if (queryTab === "schedule" || queryTab === "profile") {
      setActiveTab("schedule");
    } else if (queryTab === "analytics" || queryTab === "earnings") {
      setActiveTab("analytics");
    }
  }, [queryTab]);

  const handleTabChange = (tab: DoctorDashboardTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [inspectingPatientId, setInspectingPatientId] = useState<string | null>(null);
  const [selectedFastRxBundle, setSelectedFastRxBundle] = useState<FastRxBundle | null>(null);
  const [prescribingAppointment, setPrescribingAppointment] = useState<DoctorAppointment | null>(null);
  const [isEmergencyLeaveOpen, setIsEmergencyLeaveOpen] = useState(false);

  // Auto-switch to schedule & profile tab for unapproved doctors if today's queue is empty
  const hasAutoSwitchedRef = useRef(false);
  useEffect(() => {
    if (
      !hasAutoSwitchedRef.current &&
      profile &&
      profile.applicationStatus !== "APPROVED" &&
      appointments.length === 0
    ) {
      hasAutoSwitchedRef.current = true;
      setActiveTab("schedule");
    }
  }, [profile, appointments.length]);

  if (loading) return <Spinner label="Loading doctor clinical command center…" />;
  if (error) {
    return (
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem" }}>
        <Alert kind="error">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <span>{error}</span>
            <div>
              <Button size="sm" onClick={loadDashboard}>
                Retry loading dashboard
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }
  if (!profile) return <EmptyState>No doctor profile found.</EmptyState>;

  // Filter today's appointments in Asia/Dhaka
  const todayDhaka = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

  const todayAppointments = appointments.filter((a) => {
    try {
      const itemDhaka = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(
        new Date(a.scheduledStartAt),
      );
      return itemDhaka === todayDhaka;
    } catch {
      return false;
    }
  });

  // Calculate next eligible appointment
  const nowMs = Date.now();
  const upcomingAppointments = todayAppointments
    .filter((a) => {
      const isEligible = a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT";
      return isEligible && new Date(a.scheduledEndAt).getTime() > nowMs;
    })
    .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime());

  const nextAppointment = upcomingAppointments[0] ?? null;

  // Active queue count for tabs
  const activeQueueCount = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  ).length;

  return (
    <div className={styles.dashboardContainer}>
      {/* 1. SECTION A: Executive Doctor Welcome Header */}
      <DoctorWelcomeHeader
        user={user}
        profile={profile}
        isApproved={isApproved}
        onViewSchedule={() => navigate("/doctor/schedule")}
      />

      {/* 2. SECTION B: Operational KPI Cards (Today in Asia/Dhaka) */}
      <OperationalKpiCards
        appointments={appointments}
        loading={loading}
      />

      {/* 3. SECTION C & E: Operational Grid Row 1 (Next Appointment + Practice Status) */}
      <div className={styles.operationalGrid}>
        <NextAppointmentCard
          appointment={nextAppointment}
          loading={loading}
          onInspectPatientHistory={setInspectingPatientId}
          onOpenIssuePrescription={(appt) => setPrescribingAppointment(appt)}
        />

        <PracticeStatusWidget
          profile={profile}
          schedule={schedule}
          onOpenEditProfile={() => navigate("/doctor/profile")}
          onProfileUpdated={setProfile}
        />
      </div>

      {/* 4. SECTION D & F: Operational Grid Row 2 (Today's Queue Preview + Schedule Summary) */}
      <div className={styles.operationalGrid}>
        <TodayQueuePreview
          appointments={todayAppointments}
          onInspectPatientHistory={setInspectingPatientId}
          onOpenIssuePrescription={(appt) => setPrescribingAppointment(appt)}
        />

        <ScheduleSummaryWidget
          schedule={schedule}
          isApproved={isApproved}
          onOpenManageSchedule={() => navigate("/doctor/schedule")}
        />
      </div>

      {/* 5. SECTION G: Secondary Practice Tools & Tab Workspace */}
      <section className={styles.secondarySection} aria-label="Detailed Clinical Workspaces and Practice Tools">
        <div className={styles.secondaryHeader}>
          <h2 className={styles.secondaryTitle}>Clinical Workspaces &amp; Tools</h2>
        </div>

        {/* Workspace Tab Switcher */}
        <DoctorViewSwitcher
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          activeQueueCount={activeQueueCount}
        />

        {/* Tab Content */}
        <div className={styles.tabContentWrapper}>
          {/* TAB 1: Today's Full Queue & Radar */}
          {activeTab === "queue" && (
            <div className={styles.twoWingGrid}>
              <div className={styles.leftWing}>
                <TodayPatientRadar
                  appointments={appointments}
                  prescriptions={prescriptions}
                  onInspectPatientHistory={setInspectingPatientId}
                  onOpenIssuePrescription={(appt) => setPrescribingAppointment(appt)}
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
                <DoctorScheduleSection
                  schedule={schedule}
                  onScheduleChanged={loadDashboard}
                  isApproved={isApproved}
                />
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
      </section>

      {/* 6. Contextual Slide-out Drawer */}
      <ContextualPatientDrawer
        patientProfileId={inspectingPatientId}
        onClose={() => setInspectingPatientId(null)}
      />

      {/* 7. Dialog Modals */}
      <FastRxModal
        bundle={selectedFastRxBundle}
        onClose={() => setSelectedFastRxBundle(null)}
      />

      <IssuePrescriptionModal
        appointment={prescribingAppointment}
        isOpen={!!prescribingAppointment}
        onClose={() => setPrescribingAppointment(null)}
        onPrescriptionIssued={loadDashboard}
      />

      <EmergencyLeaveModal
        isOpen={isEmergencyLeaveOpen}
        onClose={() => setIsEmergencyLeaveOpen(false)}
        onScheduleChanged={loadDashboard}
      />

      {/* 8. Docked Clinical Status Bar */}
      <ClinicalStatusBar bmdcNumber={profile.bmdcNumber} isApproved={isApproved} />
    </div>
  );
}
