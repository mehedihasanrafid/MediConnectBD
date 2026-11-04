import { useState } from "react";
import type { DoctorAppointment } from "../../../shared/types";
import { Alert, Button } from "../../../shared/ui";
import { PatientHistoryPanel } from "../components/PatientHistoryPanel";
import styles from "./PatientFocus.module.css";

export function PatientRecordsPanel({ appointment, onClose }: { appointment: DoctorAppointment; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0);
  if (appointment.familyMemberId || appointment.familyMember) return <Alert kind="info">
    This appointment is for {appointment.familyMember?.name || "a family member"}.
    Separate family-member history is not available from the current records service.
    The booking owner’s records are not shown here.
  </Alert>;
  return <div className={styles.stack}>
    <Button size="sm" variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Refresh records</Button>
    <PatientHistoryPanel key={`${appointment.patientProfileId}:${attempt}`}
      patientProfileId={appointment.patientProfileId} onClose={onClose} />
  </div>;
}
