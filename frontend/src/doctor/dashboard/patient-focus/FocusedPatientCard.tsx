import { Button, ButtonLink } from "../../../shared/ui";
import type { DoctorAppointment } from "../../../shared/types";
import { patientIdentity, videoEntry } from "./patientFocus.model";
import type { OpenPatientPanel } from "./patientFocus.types";
import { PatientDetails } from "./PatientDetails";
import { PatientReadiness } from "./PatientReadiness";
import styles from "./PatientFocus.module.css";

export function FocusedPatientCard({ appointment, now, selected, onOpen, onReset }: {
  appointment: DoctorAppointment | null; now: Date; selected: boolean;
  onOpen: OpenPatientPanel; onReset: () => void;
}) {
  if (!appointment) return <section className={styles.focusCard} aria-label="Next patient">
    <h2>No patients remaining today</h2><p>Upcoming and past appointments are available in your appointment list.</p>
    <ButtonLink to="/doctor/appointments" variant="secondary">View appointments</ButtonLink>
  </section>;
  const identity = patientIdentity(appointment, now);
  const video = videoEntry(appointment, now);
  return <section className={styles.focusCard} aria-label={`${selected ? "Selected" : "Next"} patient: ${identity.name}`}>
    <div className={styles.sectionTop}>
      <span className={styles.eyebrow}>{selected ? "Selected patient" : "Next patient"}</span>
      {selected && <Button variant="ghost" size="sm" onClick={onReset}>Back to next patient</Button>}
    </div>
    <div className={styles.person}>
      <div className={styles.avatar} aria-hidden="true">{identity.initials}</div>
      <div>
        <div className={styles.nameLine}><h2>{identity.name}</h2>
          {appointment.mode === "VIDEO" && <PatientReadiness name={identity.name} onOpen={() => onOpen(appointment, "readiness")} />}
        </div>
        <p className={styles.muted}>{identity.subtitle}</p>
      </div>
    </div>
    <PatientDetails appointment={appointment} />
    <div className={styles.actions}>
      {video.available && <Button size="sm" onClick={() => onOpen(appointment, "video")}>Join video</Button>}
      <Button size="sm" variant={video.available ? "secondary" : "primary"} onClick={() => onOpen(appointment, "details")}>Patient details</Button>
      <Button size="sm" variant="secondary" onClick={() => onOpen(appointment, "records")}>History &amp; reports</Button>
      <Button size="sm" variant="secondary" onClick={() => onOpen(appointment, "tools")}>Consultation tools</Button>
    </div>
    {appointment.mode === "VIDEO" && !video.available && <p className={styles.caption}>{video.reason}</p>}
  </section>;
}
