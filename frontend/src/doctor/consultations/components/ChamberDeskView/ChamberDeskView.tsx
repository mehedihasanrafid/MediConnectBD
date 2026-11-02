import { Activity, Hospital, Info, MapPin } from "lucide-react";
import type { DoctorAppointment } from "../../../../shared/types";
import { formatMoney } from "../../../../shared/utils/format";
import type { VitalsIntake } from "../../types/doctorConsultation.types";
import styles from "./ChamberDeskView.module.css";

interface ChamberDeskViewProps {
  appointment: DoctorAppointment;
  vitals: VitalsIntake;
  onUpdateVital: (field: keyof VitalsIntake, value: string) => void;
}

export function ChamberDeskView({
  appointment,
  vitals,
  onUpdateVital,
}: ChamberDeskViewProps) {
  const chamberHospital = (
    appointment.slot?.chamber as unknown as {
      roomOrUnit?: string | null;
      hospital?: { name?: string; address?: string; area?: string };
    } | null
  )?.hospital;

  return (
    <div className={styles.container}>
      {/* Physical Chamber Location Header */}
      <div className={styles.locationCard}>
        <div className={styles.locationHeader}>
          <Hospital size={15} aria-hidden="true" />
          <span>In-Person Chamber Clinic</span>
        </div>

        <h2 className={styles.hospitalTitle}>
          {chamberHospital?.name || "Registered Consultation Chamber"}
        </h2>

        <div className={styles.addressText}>
          <MapPin size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
          {chamberHospital?.address
            ? `${chamberHospital.address}${chamberHospital.area ? `, ${chamberHospital.area}` : ""}`
            : "Physical Examination Suite"}
          {appointment.slot?.chamber?.roomOrUnit
            ? ` • Unit/Room: ${appointment.slot.chamber.roomOrUnit}`
            : ""}
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          <span>Fee: <strong>{formatMoney(appointment.feeAmount)}</strong></span>
          <span>•</span>
          <span>Payment: <strong>{appointment.paymentRequired ? (appointment.paymentReference ? "Paid (Reference Recorded)" : "Payment Pending") : "Direct / In-Person"}</strong></span>
        </div>
      </div>

      {/* Patient Intake Vitals Checklist */}
      <div className={styles.vitalsSection}>
        <h3 className={styles.sectionHeading}>
          <Activity size={14} aria-hidden="true" />
          <span>Patient Intake Vitals (Clinical Scratchpad)</span>
        </h3>

        <div className={styles.vitalsGrid}>
          <div className={styles.vitalItem}>
            <label htmlFor="vital-bp-sys" className={styles.vitalLabel}>BP Systolic (mmHg)</label>
            <input
              id="vital-bp-sys"
              type="text"
              placeholder="e.g. 120"
              className={styles.vitalInput}
              value={vitals.bpSystolic || ""}
              onChange={(e) => onUpdateVital("bpSystolic", e.target.value)}
            />
          </div>

          <div className={styles.vitalItem}>
            <label htmlFor="vital-bp-dia" className={styles.vitalLabel}>BP Diastolic (mmHg)</label>
            <input
              id="vital-bp-dia"
              type="text"
              placeholder="e.g. 80"
              className={styles.vitalInput}
              value={vitals.bpDiastolic || ""}
              onChange={(e) => onUpdateVital("bpDiastolic", e.target.value)}
            />
          </div>

          <div className={styles.vitalItem}>
            <label htmlFor="vital-pulse" className={styles.vitalLabel}>Pulse (bpm)</label>
            <input
              id="vital-pulse"
              type="text"
              placeholder="e.g. 74"
              className={styles.vitalInput}
              value={vitals.pulse || ""}
              onChange={(e) => onUpdateVital("pulse", e.target.value)}
            />
          </div>

          <div className={styles.vitalItem}>
            <label htmlFor="vital-temp" className={styles.vitalLabel}>Temperature (°F)</label>
            <input
              id="vital-temp"
              type="text"
              placeholder="e.g. 98.4"
              className={styles.vitalInput}
              value={vitals.temperature || ""}
              onChange={(e) => onUpdateVital("temperature", e.target.value)}
            />
          </div>

          <div className={styles.vitalItem}>
            <label htmlFor="vital-weight" className={styles.vitalLabel}>Weight (kg)</label>
            <input
              id="vital-weight"
              type="text"
              placeholder="e.g. 68"
              className={styles.vitalInput}
              value={vitals.weightKg || ""}
              onChange={(e) => onUpdateVital("weightKg", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Clinical Guidance Notice */}
      <div className={styles.intakeNotice}>
        <Info size={16} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-primary)" }} aria-hidden="true" />
        <div>
          <strong>In-Person Clinical Documentation:</strong> Chamber encounters provide physical clinical examination. Document your clinical assessment and provisional diagnosis in the right-hand panel, then author the prescription or mark the consultation completed.
        </div>
      </div>
    </div>
  );
}
