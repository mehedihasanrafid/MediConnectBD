import { CircleHelp } from "lucide-react";
import styles from "./PatientFocus.module.css";

/** Eligibility never establishes presence. Keep neutral until the API supplies live readiness. */
export function PatientReadiness({ name, onOpen }: { name: string; onOpen: () => void }) {
  return <button type="button" className={styles.readiness} onClick={onOpen}
    title="Video readiness unavailable. Open details."
    aria-label={`Video readiness unavailable for ${name}. Open details.`}>
    <CircleHelp size={14} aria-hidden="true" />
  </button>;
}

export function ReadinessDetails() {
  return <div className={styles.stack}>
    <h3>Video readiness unavailable</h3>
    <p>The service does not currently report patient check-in, waiting, or connection status.</p>
    <p>Appointment confirmation and the video join window do not indicate that the patient is online.</p>
  </div>;
}
