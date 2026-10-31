import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  MapPin,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import { appointmentsApi } from "../../../../api/appointments";
import type { DoctorAppointment } from "../../../../shared/types";
import { formatDhakaTime, formatMoney } from "../../../../shared/utils/format";
import styles from "./TodayPatientRadar.module.css";

interface TodayPatientRadarProps {
  appointments: DoctorAppointment[];
  onInspectPatientHistory: (patientProfileId: string) => void;
  onAppointmentUpdated?: () => void;
}

export function TodayPatientRadar({
  appointments,
  onInspectPatientHistory,
  onAppointmentUpdated,
}: TodayPatientRadarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "VIDEO" | "CHAMBER">("ALL");
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Filter active and upcoming consultations
  const activeAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );

  const videoCount = activeAppointments.filter((a) => a.mode === "VIDEO").length;
  const chamberCount = activeAppointments.filter((a) => a.mode === "CHAMBER").length;

  const filteredAppointments = activeAppointments.filter((appt) => {
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

  const handleComplete = async (appointmentId: string) => {
    setCompletingId(appointmentId);
    try {
      await appointmentsApi.completeAppointment(appointmentId);
      onAppointmentUpdated?.();
    } catch {
      // ignore
    } finally {
      setCompletingId(null);
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
            <h2 className={styles.radarTitle}>Today&apos;s Patient Radar & Queue</h2>
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
      {activeAppointments.length > 0 && (
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
          </div>
        </div>
      )}

      {/* Patient Queue Cards */}
      <div className={styles.patientList}>
        {filteredAppointments.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
            <span className={styles.emptyTitle}>
              {searchQuery ? "No matching patients found" : "Queue all caught up!"}
            </span>
            <span className={styles.emptyText}>
              {searchQuery
                ? "Try adjusting your search terms or filter mode."
                : "No pending consultations scheduled right now. New patient bookings will appear here in real time."}
            </span>
          </div>
        ) : (
          filteredAppointments.slice(0, 6).map((appt) => {
            const patientName = appt.patient
              ? `${appt.patient.firstName} ${appt.patient.lastName}`
              : "Demo Patient";
            const initials = appt.patient
              ? `${appt.patient.firstName?.[0] ?? "P"}${appt.patient.lastName?.[0] ?? ""}`
              : "PT";
            const isVideo = appt.mode === "VIDEO";
            const startTimeStr = formatDhakaTime(appt.scheduledStartAt);
            const endTimeStr = formatDhakaTime(appt.scheduledEndAt);
            const isCompleting = completingId === appt.id;

            return (
              <div
                key={appt.id}
                className={clsx(
                  styles.patientItem,
                  isVideo ? styles.telehealthItem : styles.chamberItem,
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
                    {isVideo && (
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
                      <span>Clinical History & Reports</span>
                    </button>

                    <button
                      type="button"
                      className={styles.completeBtn}
                      onClick={() => handleComplete(appt.id)}
                      disabled={isCompleting}
                      title="Mark consultation completed and proceed to post-visit Rx"
                    >
                      <CheckCircle2 size={13} aria-hidden="true" />
                      <span>{isCompleting ? "Completing…" : "Mark Done"}</span>
                    </button>
                  </div>

                  <Link to="/doctor/prescriptions" className={styles.rxLink}>
                    <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                    <span>Write E-Prescription</span>
                    <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle", marginLeft: "2px" }} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
