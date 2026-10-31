import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Search,
  Sparkles,
  Video,
} from "lucide-react";

import { appointmentsApi } from "../../../../api/appointments";
import { prescriptionsApi } from "../../../../api/prescriptions";
import { useToast } from "../../../../shared/ui";
import type { DoctorAppointment, Prescription } from "../../../../shared/types";
import { formatDhakaTime, formatMoney } from "../../../../shared/utils/format";
import { playChimeSound } from "../../../../shared/utils/sound";
import styles from "./TodayPatientRadar.module.css";

interface TodayPatientRadarProps {
  appointments: DoctorAppointment[];
  prescriptions?: Prescription[];
  onInspectPatientHistory: (patientProfileId: string) => void;
  onOpenIssuePrescription?: (appointment: DoctorAppointment) => void;
  onAppointmentUpdated?: () => void;
}

export function TodayPatientRadar({
  appointments,
  prescriptions = [],
  onInspectPatientHistory,
  onOpenIssuePrescription,
  onAppointmentUpdated,
}: TodayPatientRadarProps) {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "VIDEO" | "CHAMBER" | "COMPLETED">("ALL");
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Group active vs completed appointments
  const activeAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );

  const completedAppointments = appointments.filter((a) => a.status === "COMPLETED");

  const videoCount = activeAppointments.filter((a) => a.mode === "VIDEO").length;
  const chamberCount = activeAppointments.filter((a) => a.mode === "CHAMBER").length;
  const completedCount = completedAppointments.length;

  const targetAppointments =
    modeFilter === "COMPLETED" ? completedAppointments : activeAppointments;

  const filteredAppointments = targetAppointments.filter((appt) => {
    if (modeFilter === "VIDEO" && appt.mode !== "VIDEO") return false;
    if (modeFilter === "CHAMBER" && appt.mode !== "CHAMBER") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const patientName = `${appt.patient?.firstName ?? ""} ${appt.patient?.lastName ?? ""}`.toLowerCase();
      const phone = (appt.patient?.phone ?? "").toLowerCase();
      const familyName = (appt.familyMember?.name ?? "").toLowerCase();
      return patientName.includes(q) || phone.includes(q) || familyName.includes(q);
    }

    return true;
  });

  const handleComplete = async (appt: DoctorAppointment) => {
    setCompletingId(appt.id);
    try {
      await appointmentsApi.completeAppointment(appt.id);
      playChimeSound("complete");
      showToast("Consultation marked completed! Opening prescription editor…", {
        kind: "success",
      });
      onAppointmentUpdated?.();
      if (onOpenIssuePrescription) {
        onOpenIssuePrescription(appt);
      }
    } catch {
      showToast("Could not complete appointment. Please retry.", { kind: "error" });
    } finally {
      setCompletingId(null);
    }
  };

  const handleDownloadPdf = async (rxId: string, verificationCode: string) => {
    try {
      showToast("Preparing official PDF prescription…", { kind: "info" });
      await prescriptionsApi.downloadPdf(rxId, verificationCode);
      showToast("Prescription PDF downloaded successfully.", { kind: "success" });
    } catch {
      showToast("Could not download prescription PDF.", { kind: "error" });
    }
  };

  return (
    <div className={styles.radarCard}>
      {/* Header */}
      <div className={styles.radarHeader}>
        <div className={styles.titleGroup}>
          <div className={styles.radarIconWrap}>
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.radarTitle}>Today&apos;s Patient Radar &amp; Queue</h2>
            <p className={styles.radarSubtitle}>
              Live clinical intake, scheduled appointments, and instant telehealth calls
            </p>
          </div>
        </div>

        <div className={styles.activeCountBadge}>
          <span className={styles.pulseDot} aria-hidden="true" />
          <span>{activeAppointments.length} in Queue</span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className={styles.filterToolbar}>
        <div className={styles.searchBox}>
          <Search size={14} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search today's queue by patient name or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter patient queue"
          />
        </div>

        <div className={styles.filterPills}>
          <button
            type="button"
            className={clsx(styles.filterPill, modeFilter === "ALL" && styles.filterPillActive)}
            onClick={() => setModeFilter("ALL")}
          >
            All ({activeAppointments.length})
          </button>
          <button
            type="button"
            className={clsx(styles.filterPill, modeFilter === "VIDEO" && styles.filterPillActive)}
            onClick={() => setModeFilter("VIDEO")}
          >
            Video ({videoCount})
          </button>
          <button
            type="button"
            className={clsx(styles.filterPill, modeFilter === "CHAMBER" && styles.filterPillActive)}
            onClick={() => setModeFilter("CHAMBER")}
          >
            Chamber ({chamberCount})
          </button>
          <button
            type="button"
            className={clsx(styles.filterPill, modeFilter === "COMPLETED" && styles.filterPillActive)}
            onClick={() => setModeFilter("COMPLETED")}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Patient Queue Cards */}
      <div className={styles.patientList}>
        {filteredAppointments.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
            <span className={styles.emptyTitle}>
              {searchQuery
                ? "No matching patients found"
                : modeFilter === "COMPLETED"
                  ? "No completed visits yet today"
                  : "Queue all caught up!"}
            </span>
            <span className={styles.emptyText}>
              {searchQuery
                ? "Try adjusting your search terms or filter mode."
                : modeFilter === "COMPLETED"
                  ? "Ongoing consultations marked as done will appear here ready for digital prescriptions."
                  : "No pending consultations scheduled right now. New patient bookings will appear here in real time."}
            </span>
          </div>
        ) : (
          filteredAppointments.slice(0, 8).map((appt) => {
            const patientName = appt.patient
              ? `${appt.patient.firstName} ${appt.patient.lastName}`
              : "Demo Patient";
            const initials = appt.patient
              ? `${appt.patient.firstName?.[0] ?? "P"}${appt.patient.lastName?.[0] ?? ""}`
              : "PT";
            const isVideo = appt.mode === "VIDEO";
            const isCompleted = appt.status === "COMPLETED";
            const startTimeStr = formatDhakaTime(appt.scheduledStartAt);
            const endTimeStr = formatDhakaTime(appt.scheduledEndAt);
            const isCompleting = completingId === appt.id;

            // Check if prescription already issued for this appointment
            const existingRx = prescriptions.find((p) => p.appointmentId === appt.id);

            return (
              <div
                key={appt.id}
                className={clsx(
                  styles.patientItem,
                  isCompleted
                    ? styles.completedItem
                    : isVideo
                      ? styles.telehealthItem
                      : styles.chamberItem,
                )}
              >
                {/* Main Row */}
                <div className={styles.patientMain}>
                  <div className={styles.patientIdentity}>
                    <div className={styles.avatar}>{initials}</div>
                    <div className={styles.detailsCol}>
                      <h3 className={styles.patientName}>{patientName}</h3>
                      <span className={styles.patientSub}>
                        {appt.patient?.phone || "Phone verified"} •{" "}
                        {appt.familyMember ? `For: ${appt.familyMember.name}` : "Self"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.badgeStack}>
                    {isCompleted ? (
                      <span className={styles.completedBadge}>
                        <CheckCircle2 size={12} aria-hidden="true" />
                        <span>Completed Consultation</span>
                      </span>
                    ) : (
                      <span
                        className={isVideo ? styles.modeBadgeVideo : styles.modeBadgeChamber}
                      >
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
                    )}

                    <span className={styles.timePill}>
                      <Clock size={12} aria-hidden="true" />
                      <span>
                        {startTimeStr} – {endTimeStr}
                      </span>
                    </span>

                    <span className={styles.feePill}>
                      {formatMoney(appt.feeAmount)}
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className={styles.actionsBar}>
                  <div className={styles.leftButtons}>
                    {!isCompleted && isVideo && (
                      <Link to="/communication" className={styles.videoLaunchBtn}>
                        <Video size={14} aria-hidden="true" />
                        <span>Launch Telehealth Call</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      className={styles.historyBtn}
                      onClick={() => onInspectPatientHistory(appt.patientProfileId)}
                    >
                      <FileSpreadsheet size={14} aria-hidden="true" />
                      <span>Clinical History &amp; Reports</span>
                    </button>

                    {!isCompleted && (
                      <button
                        type="button"
                        className={styles.completeBtn}
                        onClick={() => handleComplete(appt)}
                        disabled={isCompleting}
                        title="Mark consultation completed and proceed to post-visit Rx"
                      >
                        <CheckCircle2 size={13} aria-hidden="true" />
                        <span>{isCompleting ? "Completing…" : "Mark Done"}</span>
                      </button>
                    )}

                    {isCompleted && existingRx && (
                      <button
                        type="button"
                        className={styles.downloadRxBtn}
                        onClick={() => handleDownloadPdf(existingRx.id, existingRx.verificationCode)}
                        title={`Download signed PDF for #${existingRx.verificationCode}`}
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
                        onClick={() => onOpenIssuePrescription?.(appt)}
                      >
                        <FileText size={13} aria-hidden="true" />
                        <span>Issue E-Prescription</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className={styles.rxLink}
                      style={{ background: "transparent", border: "none", cursor: "pointer" }}
                      onClick={() => {
                        if (onOpenIssuePrescription) {
                          onOpenIssuePrescription(appt);
                        }
                      }}
                    >
                      <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                      <span>Write E-Prescription</span>
                      <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle", marginLeft: "2px" }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
