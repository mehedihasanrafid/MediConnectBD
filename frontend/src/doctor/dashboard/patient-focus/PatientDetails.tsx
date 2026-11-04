import type { DoctorAppointment } from "../../../shared/types";
import { formatDhakaTime, formatMoney, formatStatus } from "../../../shared/utils/format";
import { patientIdentity } from "./patientFocus.model";
import styles from "./PatientFocus.module.css";

export function PatientDetails({ appointment, full = false }: { appointment: DoctorAppointment; full?: boolean }) {
  const identity = patientIdentity(appointment);
  const details = [
    ["Appointment", `${formatDhakaTime(appointment.scheduledStartAt)}–${formatDhakaTime(appointment.scheduledEndAt)}`],
    ["Consultation", appointment.mode === "VIDEO" ? "Video appointment" : "Chamber appointment"],
    ["Status", formatStatus(appointment.status)],
    [identity.family ? "Booking contact" : "Contact", appointment.patient?.phone || "Not provided"],
    ["Patient", identity.family ? `${identity.name} · ${appointment.familyMember?.relationship || "Family member"}` : "Self"],
    ["Consultation fee", formatMoney(appointment.feeAmount)],
  ];
  if (full) details.push(
    ["Booking owner", identity.owner || "Not provided"],
    ["Booking email", appointment.patient?.email || "Not provided"],
    ["Booking reference", appointment.id],
    ["Chamber", appointment.slot?.chamber?.roomOrUnit || "Not applicable / not provided"],
  );
  return <dl className={styles.details}>{details.map(([label, value]) =>
    <div className={styles.detailItem} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
}
