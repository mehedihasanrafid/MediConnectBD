import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  FileText,
  History,
  MapPin,
  Video,
} from "lucide-react";

import type { DoctorAppointment } from "../../../../shared/types";
import { appointmentStatusTone } from "../../../../shared/utils/statusTone";
import { formatDhakaTime, formatStatus } from "../../../../shared/utils/format";
import { Badge, Button, IconButton } from "../../../../shared/ui";
import styles from "./TodayQueuePreview.module.css";

interface TodayQueuePreviewProps {
  appointments: DoctorAppointment[];
  onInspectPatientHistory: (patientProfileId: string) => void;
  onOpenIssuePrescription: (appointment: DoctorAppointment) => void;
  onLaunchCall?: (appointment: DoctorAppointment) => void;
}

export function TodayQueuePreview({
  appointments,
  onInspectPatientHistory,
  onOpenIssuePrescription,
  onLaunchCall,
}: TodayQueuePreviewProps) {
  const navigate = useNavigate();

  // Sort chronologically by start time
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime(),
  );

  return (
    <section className={styles.section} aria-label="Today's Consultation Queue">
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <Calendar size={16} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
          <h2 className={styles.title}>Today&#39;s Patient Queue</h2>
          <span className={styles.countBadge}>{appointments.length} Consultations</span>
        </div>

        <Link
          to="/doctor/appointments"
          style={{ textDecoration: "none" }}
        >
          <Button size="sm" variant="ghost">
            <span>View Full Queue</span>
            <ArrowRight size={13} style={{ marginLeft: "4px" }} aria-hidden="true" />
          </Button>
        </Link>
      </div>

      {/* Content Table */}
      {sorted.length === 0 ? (
        <div className={styles.emptyState}>
          <strong className={styles.emptyTitle}>No Consultations Scheduled Today</strong>
          <p className={styles.emptyDesc}>
            There are no appointments booked for today in Asia/Dhaka time. You can view all upcoming and past bookings in your complete appointments queue.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate("/doctor/appointments")}
          >
            Open Appointment Queue
          </Button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Today's booked appointments table">
            <thead>
              <tr>
                <th scope="col">Time (Dhaka)</th>
                <th scope="col">Patient</th>
                <th scope="col">Mode</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((appt) => {
                const patientName = appt.patient
                  ? `${appt.patient.firstName} ${appt.patient.lastName}`.trim()
                  : `Patient #${appt.patientProfileId.slice(-6)}`;
                const initial = patientName[0]?.toUpperCase() ?? "P";
                const isVideo = appt.mode === "VIDEO";

                return (
                  <tr key={appt.id}>
                    <td className={styles.timeCol}>
                      {formatDhakaTime(appt.scheduledStartAt)} – {formatDhakaTime(appt.scheduledEndAt)}
                    </td>

                    <td>
                      <div className={styles.patientCell}>
                        <div className={styles.patientInitial} aria-hidden="true">
                          {initial}
                        </div>
                        <div className={styles.patientInfo}>
                          <span className={styles.patientName}>{patientName}</span>
                          <span className={styles.patientContact}>
                            {appt.patient?.phone ?? appt.patient?.email ?? "—"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className={styles.modeCell}>
                        {isVideo ? (
                          <>
                            <Video size={13} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                            <span>Video</span>
                          </>
                        ) : (
                          <>
                            <MapPin size={13} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                            <span>Chamber</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td>
                      <Badge tone={appointmentStatusTone(appt.status)}>
                        {formatStatus(appt.status)}
                      </Badge>
                    </td>

                    <td>
                      <div className={styles.actionCell}>
                        {isVideo && (appt.status === "CONFIRMED" || appt.status === "PENDING_PAYMENT") && (
                          <IconButton
                            size="sm"
                            variant="secondary"
                            aria-label={`Launch call with ${patientName}`}
                            title="Launch Video Consultation"
                            onClick={() => {
                              if (onLaunchCall) {
                                onLaunchCall(appt);
                              } else {
                                navigate(`/communication?appointmentId=${appt.id}`);
                              }
                            }}
                          >
                            <Video size={13} />
                          </IconButton>
                        )}

                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label={`View clinical history for ${patientName}`}
                          title="View Clinical History"
                          onClick={() => onInspectPatientHistory(appt.patientProfileId)}
                        >
                          <History size={13} />
                        </IconButton>

                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label={`Write prescription for ${patientName}`}
                          title="Write E-Prescription"
                          onClick={() => onOpenIssuePrescription(appt)}
                        >
                          <FileText size={13} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
