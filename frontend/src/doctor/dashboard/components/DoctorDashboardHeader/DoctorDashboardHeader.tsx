import { CalendarCheck, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";

import styles from "./DoctorDashboardHeader.module.css";

interface DoctorDashboardHeaderProps {
  bmdcNumber: string;
}

/**
 * Doctor dashboard header with BMDC badge and quick links to the appointment queue and prescriptions.
 */
export function DoctorDashboardHeader({ bmdcNumber }: DoctorDashboardHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <p className="eyebrow">Clinical Workspace</p>
        <h1>Doctor dashboard</h1>
        <p className="muted">BMDC {bmdcNumber}</p>
      </div>
      <div className={styles.actions}>
        <Link className="btn btn-primary" to="/doctor/appointments">
          <CalendarCheck size={17} />
          <span>Patient appointment queue</span>
        </Link>
        <Link className="btn btn-secondary" to="/doctor/prescriptions">
          <ClipboardList size={17} />
          <span>Issued prescriptions</span>
        </Link>
      </div>
    </header>
  );
}
