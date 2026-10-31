/**
 * Doctor appointment queue: manages upcoming and completed consultations, with one-click
 * transitions (complete / no-show / cancel), WebRTC video room entry, patient clinical history & reports
 * inspection, and inline post-visit prescription authoring with Fast-RX presets.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Search,
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
import { useDoctorQueue } from "./hooks/useDoctorQueue";
import { appointmentStatusTone } from "./utils/statusTone";
import styles from "./DoctorAppointmentsPage.module.css";

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
  } = useDoctorQueue();

  const [bmdcNumber, setBmdcNumber] = useState("BMDC-VERIFIED");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ACTIVE" | "VIDEO" | "CHAMBER" | "COMPLETED" | "PAST">("ACTIVE");

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

  if (loading) return <Spinner label="Loading appointment queue…" />;

  const activeAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );
  const completedAppointments = appointments.filter((a) => a.status === "COMPLETED");
  const pastAppointments = appointments.filter(
    (a) => a.status !== "CONFIRMED" && a.status !== "PENDING_PAYMENT" && a.status !== "COMPLETED",
  );

  const videoActiveCount = activeAppointments.filter((a) => a.mode === "VIDEO").length;
  const chamberActiveCount = activeAppointments.filter((a) => a.mode === "CHAMBER").length;

  let targetList: DoctorAppointment[] = [];
  if (filterMode === "ACTIVE") {
    targetList = activeAppointments;
  } else if (filterMode === "VIDEO") {
    targetList = activeAppointments.filter((a) => a.mode === "VIDEO");
  } else if (filterMode === "CHAMBER") {
    targetList = activeAppointments.filter((a) => a.mode === "CHAMBER");
  } else if (filterMode === "COMPLETED") {
    targetList = completedAppointments;
  } else {
    targetList = pastAppointments;
  }

  const filteredAppointments = targetList.filter((appt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = `${appt.patient?.firstName ?? ""} ${appt.patient?.lastName ?? ""}`.toLowerCase();
    const phone = (appt.patient?.phone ?? "").toLowerCase();
    const id = appt.id.toLowerCase();
    return name.includes(q) || phone.includes(q) || id.includes(q);
  });

  const handleComplete = async (appt: DoctorAppointment) => {
    await handleTransition(appt.id, "complete");
    playChimeSound("complete");
    showToast("Consultation marked completed! Opening e-prescription editor…", {
      kind: "success",
    });
    setPrescribingAppointment(appt);
  };

  const handleNoShow = async (appt: DoctorAppointment) => {
    await handleTransition(appt.id, "no-show");
    showToast("Appointment marked as patient no-show.", { kind: "info" });
  };

  const handleCancel = async (appt: DoctorAppointment) => {
    await handleTransition(appt.id, "cancel");
    showToast("Appointment cancelled. Refund policy automatically applied if paid.", {
      kind: "info",
    });
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
          <div className={styles.searchBox}>
            <Search size={14} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search queue by patient name, phone, or appointment ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter appointment queue"
            />
          </div>

          <div className={styles.filterPills}>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "ACTIVE" && styles.filterPillActive)}
              onClick={() => setFilterMode("ACTIVE")}
            >
              All Active ({activeAppointments.length})
            </button>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "VIDEO" && styles.filterPillActive)}
              onClick={() => setFilterMode("VIDEO")}
            >
              <Video size={12} aria-hidden="true" />
              <span>Video ({videoActiveCount})</span>
            </button>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "CHAMBER" && styles.filterPillActive)}
              onClick={() => setFilterMode("CHAMBER")}
            >
              <MapPin size={12} aria-hidden="true" />
              <span>Chamber ({chamberActiveCount})</span>
            </button>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "COMPLETED" && styles.filterPillActive)}
              onClick={() => setFilterMode("COMPLETED")}
            >
              <CheckCircle2 size={12} aria-hidden="true" />
              <span>Completed ({completedAppointments.length})</span>
            </button>
            <button
              type="button"
              className={clsx(styles.filterPill, filterMode === "PAST" && styles.filterPillActive)}
              onClick={() => setFilterMode("PAST")}
            >
              <span>Past / Other ({pastAppointments.length})</span>
            </button>
          </div>
        </div>

        {/* 4. Appointments List */}
        <div className={styles.queueList}>
          {filteredAppointments.length === 0 ? (
            <div className={styles.emptyState}>
              <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
              <span className={styles.emptyTitle}>
                {searchQuery
                  ? "No matching consultations found"
                  : filterMode === "ACTIVE"
                    ? "Queue all caught up!"
                    : filterMode === "COMPLETED"
                      ? "No completed visits yet in this filter"
                      : "No past appointments found."}
              </span>
              <span className={styles.emptyText}>
                {searchQuery
                  ? "Try checking your filter selection or adjusting the patient name."
                  : "All consultation requests and bookings will appear here in real time."}
              </span>
            </div>
          ) : (
            filteredAppointments.map((appt) => {
              const patientName = appt.patient
                ? `${appt.patient.firstName} ${appt.patient.lastName}`
                : "Patient Visit";
              const initials = appt.patient
                ? `${appt.patient.firstName?.[0] ?? "P"}${appt.patient.lastName?.[0] ?? ""}`
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
                          {appt.patient?.phone || "Verified contact"} •{" "}
                          {appt.familyMember ? `For: ${appt.familyMember.name} (${appt.familyMember.relationship})` : "Self"}
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
                      {!isCompleted && isVideo && appt.status === "CONFIRMED" && (
                        <Link to="/communication" className={styles.videoLaunchBtn}>
                          <Video size={14} aria-hidden="true" />
                          <span>Launch Telehealth Call</span>
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
                            onClick={() => handleNoShow(appt)}
                          >
                            <UserX size={13} aria-hidden="true" />
                            <span>Mark No-Show</span>
                          </button>

                          <button
                            type="button"
                            className={styles.cancelBtn}
                            disabled={isBusy}
                            onClick={() => handleCancel(appt)}
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

        {/* 5. Contextual Patient Inspector Drawer */}
        <ContextualPatientDrawer
          patientProfileId={inspectingPatientId}
          onClose={() => setInspectingPatientId(null)}
        />

        {/* 6. Issue Prescription Modal with Fast-RX Presets */}
        <IssuePrescriptionModal
          appointment={prescribingAppointment}
          isOpen={!!prescribingAppointment}
          onClose={() => setPrescribingAppointment(null)}
          onPrescriptionIssued={(created) => {
            if (prescribingAppointment) {
              registerCreatedPrescription(prescribingAppointment.id, created);
            }
          }}
        />

        {/* 7. Docked Clinical Status Bar */}
        <ClinicalStatusBar bmdcNumber={bmdcNumber} />
      </div>
    </Page>
  );
}
