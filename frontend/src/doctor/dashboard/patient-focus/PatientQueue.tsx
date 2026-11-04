import { Link } from "react-router-dom";
import type { DoctorAppointment } from "../../../shared/types";
import { Button } from "../../../shared/ui";
import { formatDhakaTime, formatStatus } from "../../../shared/utils/format";
import { patientIdentity } from "./patientFocus.model";
import { PatientReadiness } from "./PatientReadiness";
import styles from "./PatientFocus.module.css";

export function PatientQueue({ appointments, onSelect, onReadiness }: {
  appointments: DoctorAppointment[];
  onSelect: (appointment: DoctorAppointment) => void;
  onReadiness: (appointment: DoctorAppointment) => void;
}) {
  return <section className={styles.queueCard} aria-label="Today's patient queue">
    <div className={styles.sectionTop}><h2>Today’s queue</h2><Link to="/doctor/appointments">All appointments</Link></div>
    {!appointments.length ? <p className={styles.muted}>No other patients remaining today.</p> :
      <ol className={styles.queue}>{appointments.map((appointment) => {
        const identity = patientIdentity(appointment);
        return <li className={styles.queueRow} key={appointment.id}>
          <time dateTime={appointment.scheduledStartAt}>{formatDhakaTime(appointment.scheduledStartAt)}</time>
          <div className={styles.queueIdentity}>
            <div className={styles.nameLine}><span>{identity.name}</span>
              {appointment.mode === "VIDEO" && <PatientReadiness name={identity.name} onOpen={() => onReadiness(appointment)} />}
            </div>
            <span className={styles.caption}>{formatStatus(appointment.status)} · {identity.family ? "Family booking" : "Self"}</span>
          </div>
          <span className={styles.mode}>{appointment.mode === "VIDEO" ? "Video" : "Chamber"}</span>
          <Button size="sm" variant="secondary" aria-label={`Open patient ${identity.name}`} onClick={() => onSelect(appointment)}>Open</Button>
        </li>;
      })}</ol>}
  </section>;
}
