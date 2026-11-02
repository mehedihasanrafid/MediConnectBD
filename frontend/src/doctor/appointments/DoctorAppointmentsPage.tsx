/**
 * Doctor appointment queue: manages upcoming and completed consultations, with one-click
 * transitions (complete / no-show / cancel), WebRTC video room entry, patient clinical history & reports
 * inspection, and inline post-visit prescription authoring with Fast-RX presets.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserX,
  Video,
  XCircle,
} from "lucide-react";

import { doctorsApi } from "../../api/doctors";
import { prescriptionsApi } from "../../api/prescriptions";
import { Alert, Badge, Page, Spinner, useToast } from "../../shared/ui";
import type { DoctorAppointment, Prescription } from "../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../shared/utils/format";
import { playChimeSound } from "../../shared/utils/sound";
import { ClinicalStatusBar } from "../dashboard/components/ClinicalStatusBar";
import { ContextualPatientDrawer } from "../dashboard/components/ContextualPatientDrawer";
import { DoctorBreadcrumbs } from "../dashboard/components/DoctorBreadcrumbs";
import { IssuePrescriptionModal } from "../dashboard/components/IssuePrescriptionModal";
import { AppointmentDetailsDrawer } from "./components/AppointmentDetailsDrawer";
import { CancelAppointmentDialog } from "./components/CancelAppointmentDialog";
import { ConfirmCompletionDialog } from "./components/ConfirmCompletionDialog";
import { ConfirmNoShowDialog } from "./components/ConfirmNoShowDialog";
import { useDoctorQueue } from "./hooks/useDoctorQueue";
import { appointmentStatusTone } from "./utils/statusTone";
import styles from "./DoctorAppointmentsPage.module.css";

function toDhakaDateString(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "Verified patient";
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "••••";
  const prefix = trimmed.slice(0, 3);
  const suffix = trimmed.slice(-2);
  return `${prefix}••••••${suffix}`;
}

export function DoctorAppointmentsPage() {
  const { showToast } = useToast();
  const {
    appointments,
    prescriptionsByAppt,
    loading,
    error,
    busyId,
    handleTransition,
    registerCreatedPrescription,
    reload,
  } = useDoctorQueue();

  const [bmdcNumber, setBmdcNumber] = useState("BMDC-VERIFIED");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "VIDEO" | "CHAMBER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW">("ALL");

  // Dialog and drawer states
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<DoctorAppointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<DoctorAppointment | null>(null);
  const [noShowAppointment, setNoShowAppointment] = useState<DoctorAppointment | null>(null);
  const [completingAppointment, setCompletingAppointment] = useState<DoctorAppointment | null>(null);
  const [inspectingPatientId, setInspectingPatientId] = useState<string | null>(null);
  const [prescribingAppointment, setPrescribingAppointment] = useState<DoctorAppointment | null>(null);

  useEffect(() => {
    doctorsApi
      .getMyProfile<{ bmdcNumber?: string }>()
      .then((res) => {
        if (res && res.bmdcNumber) setBmdcNumber(res.bmdcNumber);
      })
      .catch(() => {});
  }, []);

  const todayDhaka = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const isFiltered = Boolean(
    searchQuery.trim() || selectedDate || modeFilter !== "ALL" || statusFilter !== "ALL"
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDate("");
    setModeFilter("ALL");
    setStatusFilter("ALL");
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const patientName = `${appt.patient?.firstName ?? ""} ${appt.patient?.lastName ?? ""}`.toLowerCase();
        const id = appt.id.toLowerCase();
        const matchesQuery = patientName.includes(q) || id.includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Date Filter (Dhaka timezone)
      if (selectedDate) {
        const apptDate = toDhakaDateString(appt.scheduledStartAt);
        if (apptDate !== selectedDate) return false;
      }

      // 3. Mode Filter
      if (modeFilter !== "ALL" && appt.mode !== modeFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== "ALL") {
        if (appt.status !== statusFilter) return false;
      }

      return true;
    });
  }, [appointments, searchQuery, selectedDate, modeFilter, statusFilter]);

  if (loading) return <Spinner label="Loading appointment queue…" />;

  const handleComplete = (appt: DoctorAppointment) => {
    setCompletingAppointment(appt);
  };

  const handleConfirmComplete = async (appointmentId: string) => {
    await handleTransition(appointmentId, "complete");
    playChimeSound("complete");
    showToast("Consultation marked as completed successfully.", {
      kind: "success",
    });
    setCompletingAppointment(null);
    if (selectedAppointmentForDetails?.id === appointmentId) {
      setSelectedAppointmentForDetails((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));
    }
  };

  const handleConfirmNoShow = async (appointmentId: string) => {
    await handleTransition(appointmentId, "no-show");
    showToast("Appointment marked as patient no-show.", { kind: "info" });
    if (selectedAppointmentForDetails?.id === appointmentId) {
      setSelectedAppointmentForDetails(null);
    }
  };

  const handleConfirmCancel = async (appointmentId: string, reason: string) => {
    await handleTransition(appointmentId, "cancel", reason);
    showToast("Appointment cancelled. Refund policy automatically applied if paid.", {
      kind: "info",
    });
    if (selectedAppointmentForDetails?.id === appointmentId) {
      setSelectedAppointmentForDetails(null);
    }
  };

  const handleDownloadPdf = async (rx: Prescription) => {
    try {
      showToast("Downloading signed prescription PDF…", { kind: "info" });
      await prescriptionsApi.downloadPdf(rx.id, rx.verificationCode);
      showToast("Prescription PDF downloaded successfully.", { kind: "success" });
    } catch {
      showToast("Could not download prescription PDF.", { kind: "error" });
    }
  };

  return (
    <Page>
      <div className={styles.container}>
        {/* 1. Desktop Breadcrumbs Bar & Digital Dhaka Clock */}
        <DoctorBreadcrumbs activeTabLabel="Patient Appointment Queue" />

        {/* 2. Page Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerTextGroup}>
            <span className={styles.eyebrow}>Clinical Queue Management</span>
            <h1 className={styles.title}>Patient Appointment Queue</h1>
            <p className={styles.description}>
              Live intake, upcoming consultations, completed visits, and digital prescription issuance.
            </p>
          </div>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        {/* 3. Filter Toolbar & Search */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarTopRow}>
            <div className={styles.searchBox}>
              <Search size={14} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search queue by patient name or booking ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter appointment queue"
              />
            </div>

            <div className={styles.dateFilterBox}>
              <Calendar size={14} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
              <input
                type="date"
                className={styles.dateInput}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Filter by appointment date (Asia/Dhaka)"
                title="Filter by appointment date (Asia/Dhaka)"
              />
              <button
                type="button"
                className={clsx(styles.filterPill, selectedDate === todayDhaka && styles.filterPillActive)}
                onClick={() => setSelectedDate(selectedDate === todayDhaka ? "" : todayDhaka)}
              >
                Today
              </button>
            </div>

            {isFiltered && (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={resetFilters}
                aria-label="Reset all filters"
              >
                <RotateCcw size={12} aria-hidden="true" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className={styles.toolbarBottomRow}>
            <div className={styles.filterPills}>
              <button
                type="button"
                className={clsx(styles.filterPill, modeFilter === "ALL" && styles.filterPillActive)}
                onClick={() => setModeFilter("ALL")}
              >
                All Modes
              </button>
              <button
                type="button"
                className={clsx(styles.filterPill, modeFilter === "VIDEO" && styles.filterPillActive)}
                onClick={() => setModeFilter("VIDEO")}
              >
                <Video size={12} aria-hidden="true" />
                <span>Video</span>
              </button>
              <button
                type="button"
                className={clsx(styles.filterPill, modeFilter === "CHAMBER" && styles.filterPillActive)}
                onClick={() => setModeFilter("CHAMBER")}
              >
                <MapPin size={12} aria-hidden="true" />
                <span>Chamber</span>
              </button>

              <span style={{ margin: "0 var(--space-1)", color: "var(--color-border)" }}>|</span>

              <button
                type="button"
                className={clsx(styles.filterPill, statusFilter === "ALL" && styles.filterPillActive)}
                onClick={() => setStatusFilter("ALL")}
              >
                All Statuses
              </button>
              <button
                type="button"
                className={clsx(styles.filterPill, statusFilter === "CONFIRMED" && styles.filterPillActive)}
                onClick={() => setStatusFilter("CONFIRMED")}
              >
                Confirmed
              </button>
              <button
                type="button"
                className={clsx(styles.filterPill, statusFilter === "COMPLETED" && styles.filterPillActive)}
                onClick={() => setStatusFilter("COMPLETED")}
              >
                Completed
              </button>
              <button
                type="button"
                className={clsx(styles.filterPill, statusFilter === "CANCELLED" && styles.filterPillActive)}
                onClick={() => setStatusFilter("CANCELLED")}
              >
                Cancelled
              </button>
              <button
                type="button"
                className={clsx(styles.filterPill, statusFilter === "NO_SHOW" && styles.filterPillActive)}
                onClick={() => setStatusFilter("NO_SHOW")}
              >
                No-Show
              </button>
            </div>

            <span className={styles.resultCount}>
              {`Showing ${filteredAppointments.length} of ${appointments.length} consultations`}
            </span>
          </div>
        </div>

        {/* 4. Appointments List */}
        <div className={styles.queueList}>
          {filteredAppointments.length === 0 ? (
            <div className={styles.emptyState}>
              <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
              <span className={styles.emptyTitle}>
                {isFiltered
                  ? "No matching consultations found"
                  : "Queue all caught up!"}
              </span>
              <span className={styles.emptyText}>
                {isFiltered
                  ? "Try checking your search terms or clearing your date and status filters."
                  : "All consultation requests and bookings will appear here in real time."}
              </span>
            </div>
          ) : (
            filteredAppointments.map((appt) => {
              const patientName = appt.patient
                ? `${appt.patient.firstName} ${appt.patient.lastName}`.trim()
                : "Patient Visit";
              const initials = appt.patient
                ? `${appt.patient.firstName?.[0] ?? "P"}${appt.patient.lastName?.[0] ?? ""}`.toUpperCase()
                : "PT";
              const isVideo = appt.mode === "VIDEO";
              const isCompleted = appt.status === "COMPLETED";
              const isBusy = busyId === appt.id;
              const existingRx = prescriptionsByAppt[appt.id];

              return (
                <div
                  key={appt.id}
                  className={clsx(
                    styles.appointmentCard,
                    isCompleted
                      ? styles.cardCompleted
                      : isVideo
                        ? styles.cardVideo
                        : styles.cardChamber,
                  )}
                >
                  {/* Top Row */}
                  <div className={styles.cardTopRow}>
                    <div className={styles.patientGroup}>
                      <div className={styles.avatar}>{initials}</div>
                      <div className={styles.patientDetails}>
                        <h3 className={styles.patientName}>{patientName}</h3>
                        <span className={styles.patientSub}>
                          <span className={styles.privacyPhone} title="Full phone number visible in details drawer">
                            <ShieldCheck size={11} aria-hidden="true" />
                            {maskPhoneNumber(appt.patient?.phone)}
                          </span>
                          {" • "}
                          {appt.familyMember
                            ? `For: ${appt.familyMember.name} (${appt.familyMember.relationship})`
                            : "Self"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.badgeStack}>
                      <Badge tone={appointmentStatusTone(appt.status)}>
                        {formatStatus(appt.status)}
                      </Badge>

                      <span className={isVideo ? styles.modeBadgeVideo : styles.modeBadgeChamber}>
                        {isVideo ? (
                          <>
                            <Video size={13} aria-hidden="true" />
                            <span>Telehealth Video</span>
                          </>
                        ) : (
                          <>
                            <MapPin size={13} aria-hidden="true" />
                            <span>Chamber Visit</span>
                          </>
                        )}
                      </span>

                      <span className={styles.timePill}>
                        <Clock size={12} aria-hidden="true" />
                        <span>{formatDhakaDateTime(appt.scheduledStartAt)}</span>
                      </span>

                      <span className={styles.feePill}>{formatMoney(appt.feeAmount)}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className={styles.actionsBar}>
                    <div className={styles.leftActions}>
                      <button
                        type="button"
                        className={styles.detailsBtn}
                        onClick={() => setSelectedAppointmentForDetails(appt)}
                      >
                        <Eye size={13} aria-hidden="true" />
                        <span>View Details</span>
                      </button>

                      {!isCompleted && isVideo && appt.status === "CONFIRMED" && (
                        <Link to={`/doctor/consultations/${appt.id}`} className={styles.videoLaunchBtn}>
                          <Video size={14} aria-hidden="true" />
                          <span>Launch Telehealth Call</span>
                        </Link>
                      )}

                      {!isCompleted && !isVideo && appt.status === "CONFIRMED" && (
                        <Link
                          to={`/doctor/consultations/${appt.id}`}
                          className={styles.videoLaunchBtn}
                          style={{ backgroundColor: "var(--color-success)" }}
                        >
                          <MapPin size={14} aria-hidden="true" />
                          <span>Start Chamber Visit</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        className={styles.historyBtn}
                        onClick={() => setInspectingPatientId(appt.patientProfileId)}
                      >
                        <FileSpreadsheet size={14} aria-hidden="true" />
                        <span>Clinical History &amp; Reports</span>
                      </button>

                      {appt.status === "CONFIRMED" && (
                        <>
                          <button
                            type="button"
                            className={styles.completeBtn}
                            disabled={isBusy}
                            onClick={() => handleComplete(appt)}
                          >
                            <CheckCircle2 size={13} aria-hidden="true" />
                            <span>Mark Completed</span>
                          </button>

                          <button
                            type="button"
                            className={styles.noShowBtn}
                            disabled={isBusy}
                            onClick={() => setNoShowAppointment(appt)}
                          >
                            <UserX size={13} aria-hidden="true" />
                            <span>Mark No-Show</span>
                          </button>

                          <button
                            type="button"
                            className={styles.cancelBtn}
                            disabled={isBusy}
                            onClick={() => setCancellingAppointment(appt)}
                          >
                            <XCircle size={13} aria-hidden="true" />
                            <span>Cancel Visit</span>
                          </button>
                        </>
                      )}

                      {isCompleted && existingRx && (
                        <button
                          type="button"
                          className={styles.downloadRxBtn}
                          onClick={() => handleDownloadPdf(existingRx)}
                        >
                          <Download size={13} aria-hidden="true" />
                          <span>Download PDF (#{existingRx.verificationCode})</span>
                        </button>
                      )}
                    </div>

                    {isCompleted ? (
                      existingRx ? (
                        <Link to="/doctor/prescriptions" className={styles.rxLink}>
                          <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                          <span>View / Edit Prescription</span>
                          <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle", marginLeft: "2px" }} />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={styles.issueRxBtn}
                          onClick={() => setPrescribingAppointment(appt)}
                        >
                          <FileText size={13} aria-hidden="true" />
                          <span>Issue E-Prescription</span>
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Appointment Details Drawer */}
        <AppointmentDetailsDrawer
          appointment={selectedAppointmentForDetails}
          isOpen={Boolean(selectedAppointmentForDetails)}
          onClose={() => setSelectedAppointmentForDetails(null)}
          onInspectPatientHistory={(patientProfileId) => setInspectingPatientId(patientProfileId)}
          onComplete={(appt) => handleComplete(appt)}
          onNoShow={(appt) => setNoShowAppointment(appt)}
          onCancel={(appt) => setCancellingAppointment(appt)}
          onIssueRx={(appt) => setPrescribingAppointment(appt)}
          onDownloadRx={handleDownloadPdf}
          existingRx={
            selectedAppointmentForDetails
              ? prescriptionsByAppt[selectedAppointmentForDetails.id]
              : undefined
          }
          isBusy={Boolean(selectedAppointmentForDetails && busyId === selectedAppointmentForDetails.id)}
        />

        {/* 6. Cancel Appointment Dialog with reason & refund policy */}
        <CancelAppointmentDialog
          open={Boolean(cancellingAppointment)}
          onOpenChange={(open) => {
            if (!open) setCancellingAppointment(null);
          }}
          appointment={cancellingAppointment}
          onConfirmCancel={handleConfirmCancel}
          isCancelling={Boolean(cancellingAppointment && busyId === cancellingAppointment.id)}
        />

        {/* 7. Confirm No-Show Dialog */}
        <ConfirmNoShowDialog
          open={Boolean(noShowAppointment)}
          onOpenChange={(open) => {
            if (!open) setNoShowAppointment(null);
          }}
          appointment={noShowAppointment}
          onConfirmNoShow={handleConfirmNoShow}
          isUpdating={Boolean(noShowAppointment && busyId === noShowAppointment.id)}
        />

        {/* 8. Confirm Completion Dialog */}
        <ConfirmCompletionDialog
          open={Boolean(completingAppointment)}
          onOpenChange={(open) => {
            if (!open) setCompletingAppointment(null);
          }}
          appointment={completingAppointment}
          onConfirmComplete={handleConfirmComplete}
        />

        {/* 9. Contextual Patient Inspector Drawer */}
        <ContextualPatientDrawer
          patientProfileId={inspectingPatientId}
          onClose={() => setInspectingPatientId(null)}
        />

        {/* 10. Issue Prescription Modal with Fast-RX Presets */}
        <IssuePrescriptionModal
          appointment={prescribingAppointment}
          isOpen={!!prescribingAppointment}
          onClose={() => setPrescribingAppointment(null)}
          onPrescriptionIssued={(created) => {
            if (prescribingAppointment) {
              registerCreatedPrescription(prescribingAppointment.id, created);
            }
          }}
          onAppointmentCompleted={() => {
            void reload();
          }}
        />

        {/* 11. Docked Clinical Status Bar */}
        <ClinicalStatusBar bmdcNumber={bmdcNumber} />
      </div>
    </Page>
  );
}
