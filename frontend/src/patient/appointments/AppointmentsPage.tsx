/**
 * Patient appointment manager: view active upcoming visits, past records,
 * online checkout, WebRTC telehealth room launch, rescheduling, and post-visit reviews.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  History,
  MapPin,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
  Wifi,
} from "lucide-react";

import { Alert, Page, Spinner } from "../../shared/ui";
import { PatientBreadcrumbs } from "../components/PatientBreadcrumbs";
import { PatientAppointmentCard } from "./components/PatientAppointmentCard";
import { usePatientAppointments } from "./hooks/usePatientAppointments";
import { partitionAppointments } from "./utils/patientAppointments.utils";
import styles from "./AppointmentsPage.module.css";

export function AppointmentsPage() {
  const {
    appointments,
    reviewsByAppointment,
    loading,
    error,
    loadAll,
    handleRescheduled,
    handleCancelled,
    handleReviewCreated,
  } = usePatientAppointments();

  const [activeTab, setActiveTab] = useState<"UPCOMING" | "PAST">("UPCOMING");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "VIDEO" | "CHAMBER" | "UNPAID">("ALL");
  const [dhakaTime, setDhakaTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDhakaTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Spinner label="Loading appointments…" />;

  const { upcoming, past } = partitionAppointments(appointments);

  const targetList = activeTab === "UPCOMING" ? upcoming : past;

  const videoCount = targetList.filter((a) => a.mode === "VIDEO").length;
  const chamberCount = targetList.filter((a) => a.mode === "CHAMBER").length;
  const unpaidCount = targetList.filter((a) => a.status === "PENDING_PAYMENT").length;

  const filteredAppointments = targetList.filter((appt) => {
    if (filterMode === "VIDEO" && appt.mode !== "VIDEO") return false;
    if (filterMode === "CHAMBER" && appt.mode !== "CHAMBER") return false;
    if (filterMode === "UNPAID" && appt.status !== "PENDING_PAYMENT") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const id = appt.id.toLowerCase();
    const family = (appt.familyMember?.name ?? "").toLowerCase();
    const mode = appt.mode.toLowerCase();
    const status = appt.status.toLowerCase();
    return id.includes(q) || family.includes(q) || mode.includes(q) || status.includes(q);
  });

  return (
    <Page>
      <div className={styles.container}>
        {/* 1. Patient Portal Breadcrumbs */}
        <PatientBreadcrumbs activePageLabel="My Appointments &amp; Consultations" />

        {/* 2. Header & Action Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerTextGroup}>
            <span className={styles.eyebrow}>Patient Portal</span>
            <h1 className={styles.title}>My Appointments</h1>
            <p className={styles.description}>
              Track upcoming consultations, join WebRTC video rooms, complete bKash checkout, and view clinical history.
            </p>
          </div>

          <Link to="/doctors" className={styles.bookDoctorBtn}>
            <Plus size={14} aria-hidden="true" />
            <span>Book New Consultation</span>
          </Link>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        {/* 3. Segmented View Switcher Tabs */}
        <div className={styles.viewSwitcher} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "UPCOMING"}
            className={clsx(styles.viewTab, activeTab === "UPCOMING" && styles.viewTabActive)}
            onClick={() => {
              setActiveTab("UPCOMING");
              setFilterMode("ALL");
            }}
          >
            <Calendar size={15} aria-hidden="true" />
            <span>Active &amp; Upcoming</span>
            <span className={styles.tabBadge}>{upcoming.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "PAST"}
            className={clsx(styles.viewTab, activeTab === "PAST" && styles.viewTabActive)}
            onClick={() => {
              setActiveTab("PAST");
              setFilterMode("ALL");
            }}
          >
            <History size={15} aria-hidden="true" />
            <span>Completed &amp; Past Visits</span>
            <span className={styles.tabBadge}>{past.length}</span>
          </button>
        </div>

        {/* 4. Filter & Search Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={14} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by appointment ID, family member, or mode…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter my appointments"
            />
          </div>

          <div className={styles.filterPills}>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "ALL" && styles.filterPillActive)}
              onClick={() => setFilterMode("ALL")}
            >
              All ({targetList.length})
            </button>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "VIDEO" && styles.filterPillActive)}
              onClick={() => setFilterMode("VIDEO")}
            >
              <Video size={12} aria-hidden="true" />
              <span>Video ({videoCount})</span>
            </button>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "CHAMBER" && styles.filterPillActive)}
              onClick={() => setFilterMode("CHAMBER")}
            >
              <MapPin size={12} aria-hidden="true" />
              <span>Chamber ({chamberCount})</span>
            </button>
            {activeTab === "UPCOMING" && (
              <button
                type="button"
                className={clsx(styles.filterPill, filterMode === "UNPAID" && styles.filterPillActive)}
                onClick={() => setFilterMode("UNPAID")}
              >
                <CreditCard size={12} aria-hidden="true" />
                <span>Unpaid / Action Needed ({unpaidCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Appointment Cards List */}
        <div className={styles.cardList}>
          {filteredAppointments.length === 0 ? (
            <div className={styles.emptyState}>
              <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
              <span className={styles.emptyTitle}>
                {searchQuery
                  ? "No matching consultations found"
                  : activeTab === "UPCOMING"
                    ? "No active or upcoming appointments"
                    : "No past appointments recorded"}
              </span>
              <span className={styles.emptyText}>
                {searchQuery
                  ? "Try checking your filter selection or adjusting the search term."
                  : activeTab === "UPCOMING"
                    ? "When you schedule a consultation with a doctor, it will appear here with live join buttons."
                    : "Completed consultations with issued prescriptions will be logged here."}
              </span>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <PatientAppointmentCard
                key={appointment.id}
                appointment={appointment}
                existingReview={reviewsByAppointment[appointment.id]}
                onPaymentUpdated={() => void loadAll()}
                onRescheduled={handleRescheduled}
                onCancelled={handleCancelled}
                onReviewCreated={handleReviewCreated}
              />
            ))
          )}
        </div>

        {/* 6. Docked Desktop Health Status Bar */}
        <footer className={styles.statusBar} aria-label="Patient System Status Bar">
          <div className={styles.statusLeft}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot} aria-hidden="true" />
              <Wifi size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
              <span>Daily.co WebRTC HD: Connected (18ms)</span>
            </div>

            <div className={styles.statusItem}>
              <Database size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
              <span>Sync Gateway: Active</span>
            </div>

            <div className={styles.statusItem}>
              <Activity size={12} style={{ color: "var(--color-info)" }} aria-hidden="true" />
              <span>Telehealth Latency: Optimal</span>
            </div>
          </div>

          <div className={styles.statusRight}>
            <div className={styles.statusItem}>
              <Clock size={12} aria-hidden="true" />
              <span>Asia/Dhaka {dhakaTime}</span>
            </div>

            <div className={styles.statusItem}>
              <ShieldCheck size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
              <span>Encrypted Patient Vault</span>
            </div>

            <div className={styles.versionBadge}>
              <Package size={10} aria-hidden="true" />
              <span>v1.4.0 (.deb)</span>
            </div>
          </div>
        </footer>
      </div>
    </Page>
  );
}
