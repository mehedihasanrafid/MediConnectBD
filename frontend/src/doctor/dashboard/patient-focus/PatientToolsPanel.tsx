import type { DoctorAppointment } from "../../../shared/types";
import { Button, ButtonLink } from "../../../shared/ui";
import type { OpenPatientPanel } from "./patientFocus.types";
import { videoEntry } from "./patientFocus.model";
import styles from "./PatientFocus.module.css";

export function PatientToolsPanel({ appointment, now, onOpen }: {
  appointment: DoctorAppointment; now: Date; onOpen: OpenPatientPanel;
}) {
  const confirmed = appointment.status === "CONFIRMED";
  const canCancel = confirmed || appointment.status === "PENDING_PAYMENT";
  const started = now.getTime() >= Date.parse(appointment.scheduledStartAt);
  const ended = now.getTime() >= Date.parse(appointment.scheduledEndAt);
  const video = videoEntry(appointment, now);
  return <div className={styles.stack}>
    {appointment.mode === "VIDEO" && <div className={styles.tool}>
      <h3>Video consultation</h3><p className={styles.muted}>{video.reason}</p>
      <Button size="sm" disabled={!video.available} onClick={() => onOpen(appointment, "video")}>Join video</Button>
    </div>}
    <div className={styles.tool}><h3>Clinical workspace</h3>
      <ButtonLink size="sm" variant="secondary" to={`/doctor/consultations/${encodeURIComponent(appointment.id)}`}>Open consultation workspace</ButtonLink>
      <Button size="sm" variant="secondary" disabled={!confirmed && appointment.status !== "COMPLETED"}
        onClick={() => onOpen(appointment, "prescription")}>Write prescription</Button>
      <ButtonLink size="sm" variant="secondary" to={`/doctor/communication?appointmentId=${encodeURIComponent(appointment.id)}`}>Consultation messages</ButtonLink>
    </div>
    <div className={styles.tool}><h3>Appointment actions</h3>
      <Button size="sm" variant="secondary" disabled={!confirmed || !started} onClick={() => onOpen(appointment, "complete")}>Mark completed</Button>
      <Button size="sm" variant="secondary" disabled={!confirmed || !ended} onClick={() => onOpen(appointment, "no-show")}>Mark no-show</Button>
      <Button size="sm" variant="danger" disabled={!canCancel} onClick={() => onOpen(appointment, "cancel")}>Cancel appointment</Button>
      <p className={styles.caption}>Each action requires confirmation. Completing a consultation is available after its scheduled start.</p>
    </div>
  </div>;
}
