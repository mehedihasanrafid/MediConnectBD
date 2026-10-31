import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  Clock,
  FileSpreadsheet,
  FileText,
  MapPin,
  Sparkles,
  Video,
} from "lucide-react";
import type { DoctorAppointment } from "../../../../shared/types";
import { formatDhakaTime, formatMoney } from "../../../../shared/utils/format";
import styles from "./TodayPatientRadar.module.css";

interface TodayPatientRadarProps {
  appointments: DoctorAppointment[];
  onInspectPatientHistory: (patientProfileId: string) => void;
}

export function TodayPatientRadar({
  appointments,
  onInspectPatientHistory,
}: TodayPatientRadarProps) {
  // Filter active and upcoming consultations
  const activeAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );

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

      {/* Patient Queue Cards */}
      <div className={styles.patientList}>
        {activeAppointments.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={28} className={styles.emptyIcon} aria-hidden="true" />
            <span className={styles.emptyTitle}>Queue all caught up!</span>
            <span className={styles.emptyText}>
              No pending consultations scheduled right now. New patient bookings will appear here
              in real time.
            </span>
          </div>
        ) : (
          activeAppointments.slice(0, 5).map((appt) => {
            const patientName = appt.patient
              ? `${appt.patient.firstName} ${appt.patient.lastName}`
              : "Demo Patient";
            const initials = appt.patient
              ? `${appt.patient.firstName?.[0] ?? "P"}${appt.patient.lastName?.[0] ?? ""}`
              : "PT";
            const isVideo = appt.mode === "VIDEO";
            const startTimeStr = formatDhakaTime(appt.scheduledStartAt);
            const endTimeStr = formatDhakaTime(appt.scheduledEndAt);

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
