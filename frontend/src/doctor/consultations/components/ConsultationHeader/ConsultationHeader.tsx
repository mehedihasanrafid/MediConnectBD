import { Link } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Video } from "lucide-react";
import type { DoctorAppointment } from "../../../../shared/types";
import { Badge } from "../../../../shared/ui";
import { formatDhakaDateTime, formatStatus } from "../../../../shared/utils/format";
import { appointmentStatusTone } from "../../../appointments/utils/statusTone";
import styles from "./ConsultationHeader.module.css";

interface ConsultationHeaderProps {
  appointment: DoctorAppointment;
}

export function ConsultationHeader({ appointment }: ConsultationHeaderProps) {
  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : "Patient Visit";

  const initials = appointment.patient
    ? `${appointment.patient.firstName?.[0] ?? "P"}${appointment.patient.lastName?.[0] ?? ""}`.toUpperCase()
    : "PT";

  const isVideo = appointment.mode === "VIDEO";

  return (
    <header className={styles.header} aria-label="Consultation Clinical Context Header">
      <div className={styles.topRow}>
        <div className={styles.patientGroup}>
          <Link to="/doctor/appointments" className={styles.backBtn} aria-label="Back to appointment queue">
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Queue</span>
          </Link>

          <div className={styles.avatar}>{initials}</div>

          <div className={styles.patientMeta}>
            <h1 className={styles.patientName}>{patientName}</h1>
            <span className={styles.patientSubtitle}>
              Encounter ID: {appointment.id} •{" "}
              {appointment.familyMember
                ? `Beneficiary: ${appointment.familyMember.name} (${appointment.familyMember.relationship})`
                : "Self consultation"}
            </span>
          </div>
        </div>

        <div className={styles.badgeStack}>
          <span className={isVideo ? styles.modeBadgeVideo : styles.modeBadgeChamber}>
            {isVideo ? (
              <>
                <Video size={13} aria-hidden="true" />
                <span>Telehealth Video</span>
              </>
            ) : (
              <>
                <MapPin size={13} aria-hidden="true" />
                <span>In-Person Chamber</span>
              </>
            )}
          </span>

          <span className={styles.timePill}>
            <Clock size={12} aria-hidden="true" />
            <span>{formatDhakaDateTime(appointment.scheduledStartAt)}</span>
          </span>

          <Badge tone={appointmentStatusTone(appointment.status)}>
            {formatStatus(appointment.status)}
          </Badge>
        </div>
      </div>
    </header>
  );
}
