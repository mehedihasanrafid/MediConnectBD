import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Clock,
  FileText,
  History,
  MapPin,
  Sparkles,
  Video,
} from "lucide-react";

import type { DoctorAppointment } from "../../../../shared/types";
import { appointmentStatusTone } from "../../../../shared/utils/statusTone";
import { formatDhakaTime, formatStatus } from "../../../../shared/utils/format";
import { Badge, Button, Skeleton } from "../../../../shared/ui";
import styles from "./NextAppointmentCard.module.css";

interface NextAppointmentCardProps {
  appointment: DoctorAppointment | null;
  loading?: boolean;
  onInspectPatientHistory: (patientProfileId: string) => void;
  onOpenIssuePrescription: (appointment: DoctorAppointment) => void;
  onLaunchCall?: (appointment: DoctorAppointment) => void;
}

export function NextAppointmentCard({
  appointment,
  loading,
  onInspectPatientHistory,
  onOpenIssuePrescription,
  onLaunchCall,
}: NextAppointmentCardProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className={styles.card} aria-label="Next upcoming consultation">
        <div className={styles.headerRow}>
          <Skeleton width="120px" height="1rem" />
          <Skeleton width="80px" height="1.2rem" radius="var(--radius-full)" />
        </div>
        <div className={styles.patientHero}>
          <Skeleton width="44px" height="44px" radius="var(--radius-full)" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <Skeleton width="60%" height="1.2rem" />
            <Skeleton width="40%" height="0.8rem" />
          </div>
        </div>
        <div className={styles.detailsGrid}>
          <Skeleton height="2rem" />
          <Skeleton height="2rem" />
          <Skeleton height="2rem" />
        </div>
      </section>
    );
  }

  if (!appointment) {
    return (
      <section className={styles.card} aria-label="Next upcoming consultation">
        <div className={styles.headerRow}>
          <div className={styles.eyebrow}>
            <CalendarClock size={14} aria-hidden="true" />
            <span>Next Eligible Consultation</span>
          </div>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <Sparkles size={20} />
          </div>
          <strong className={styles.emptyTitle}>Queue Cleared for Today</strong>
          <p className={styles.emptyDesc}>
            No pending consultations requiring immediate attention. You are all caught up!
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate("/doctor/appointments")}
          >
            View Full Appointment History
          </Button>
        </div>
      </section>
    );
  }

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : `Patient #${appointment.patientProfileId.slice(-6)}`;

  const initials = patientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isVideo = appointment.mode === "VIDEO";
  const chamberLocation = appointment.slot?.chamber?.roomOrUnit ?? null;

  const handleLaunch = () => {
    if (onLaunchCall) {
      onLaunchCall(appointment);
    } else {
      navigate(`/communication?appointmentId=${appointment.id}`);
    }
  };

  return (
    <article className={styles.card} aria-label={`Next appointment with ${patientName}`}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.eyebrow}>
          <CalendarClock size={14} aria-hidden="true" />
          <span>Next Scheduled Consultation</span>
        </div>
        <div className={styles.badgeGroup}>
          <Badge tone={appointmentStatusTone(appointment.status)}>
            {formatStatus(appointment.status)}
          </Badge>
        </div>
      </div>

      {/* Patient Hero Info */}
      <div className={styles.patientHero}>
        <div className={styles.patientAvatar} aria-hidden="true">
          {initials}
        </div>
        <div className={styles.patientMeta}>
          <span className={styles.patientName}>{patientName}</span>
          <span className={styles.patientSubtext}>
            {appointment.patient?.gender ? `${appointment.patient.gender} · ` : ""}
            {appointment.patient?.phone ?? appointment.patient?.email ?? "Contact on file"}
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Session Time</span>
          <span className={styles.detailValue}>
            <Clock size={13} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
            {formatDhakaTime(appointment.scheduledStartAt)} – {formatDhakaTime(appointment.scheduledEndAt)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Consultation Mode</span>
          <span className={styles.detailValue}>
            {isVideo ? (
              <>
                <Video size={13} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
                <span>Telehealth Video</span>
              </>
            ) : (
              <>
                <MapPin size={13} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
                <span>Chamber {chamberLocation ? `(${chamberLocation})` : "Visit"}</span>
              </>
            )}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Encounter ID</span>
          <span className={styles.detailValue} style={{ fontFamily: "monospace", fontSize: "0.6875rem" }}>
            #{appointment.id.slice(-8)}
          </span>
        </div>
      </div>

      {/* Action Row */}
      <div className={styles.actionsRow}>
        {isVideo && (appointment.status === "CONFIRMED" || appointment.status === "PENDING_PAYMENT") && (
          <Button size="sm" variant="primary" onClick={handleLaunch}>
            <Video size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
            Launch Telehealth Call
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onInspectPatientHistory(appointment.patientProfileId)}
        >
          <History size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
          Clinical History
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpenIssuePrescription(appointment)}
        >
          <FileText size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
          Write Rx
        </Button>
      </div>
    </article>
  );
}
