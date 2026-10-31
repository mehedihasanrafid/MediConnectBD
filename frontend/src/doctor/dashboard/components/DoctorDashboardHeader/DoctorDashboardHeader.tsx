import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useAuth } from "../../../../features/auth/AuthContext";
import styles from "./DoctorDashboardHeader.module.css";

interface DoctorDashboardHeaderProps {
  bmdcNumber: string;
  degrees?: string | null;
  experienceYears?: number;
  specialties?: Array<{ id: string; name: string }>;
  todayAppointmentsCount?: number;
}

/**
 * Executive Doctor Hero Header with verified credentials, specialty badges,
 * interactive Telehealth availability switch, and direct action shortcuts.
 */
export function DoctorDashboardHeader({
  bmdcNumber,
  degrees,
  experienceYears,
  specialties = [],
  todayAppointmentsCount = 0,
}: DoctorDashboardHeaderProps) {
  const { user } = useAuth();
  const [isTelehealthOnline, setIsTelehealthOnline] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mediconnect_doctor_online") === "true";
    } catch {
      return true;
    }
  });

  const doctorName = user ? `Dr. ${user.firstName} ${user.lastName}` : "Dr. Specialist";
  const initials = user
    ? `${user.firstName?.[0] ?? "D"}${user.lastName?.[0] ?? "R"}`
    : "DR";

  const toggleOnline = () => {
    setIsTelehealthOnline((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mediconnect_doctor_online", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className={styles.heroCard}>
      <div className={styles.topBar}>
        {/* Doctor Avatar & Identity */}
        <div className={styles.profileGroup}>
          <div className={styles.avatar} aria-hidden="true">
            <span>{initials}</span>
            {isTelehealthOnline && <span className={styles.onlineBadge} title="Available online" />}
          </div>

          <div className={styles.doctorInfo}>
            <div className={styles.doctorNameRow}>
              <h1 className={styles.doctorName}>{doctorName}</h1>
              <span className={styles.bmdcBadge}>
                <ShieldCheck size={14} aria-hidden="true" />
                <span>BMDC #{bmdcNumber}</span>
              </span>
            </div>

            <div className={styles.metaRow}>
              {degrees && <span className={styles.degrees}>{degrees}</span>}
              {experienceYears !== undefined && experienceYears > 0 && (
                <span>• {experienceYears} years experience</span>
              )}
              {specialties.length > 0 && (
                <div className={styles.metaRow}>
                  {specialties.map((s) => (
                    <span key={s.id} className={styles.specialtyPill}>
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Telehealth Status Switch */}
        <div className={styles.statusControls}>
          <button
            type="button"
            className={clsx(
              styles.telehealthToggle,
              isTelehealthOnline && styles.telehealthToggleActive,
            )}
            onClick={toggleOnline}
            aria-pressed={isTelehealthOnline}
            title="Click to toggle instant telehealth consultation availability"
          >
            <span
              className={clsx(styles.pulseDot, isTelehealthOnline && styles.pulseDotActive)}
              aria-hidden="true"
            />
            <Video size={15} aria-hidden="true" />
            <span>
              {isTelehealthOnline ? "Available for Video" : "Scheduled Only"}
            </span>
          </button>
        </div>
      </div>

      {/* Action Navigation Row */}
      <div className={styles.actionsRow}>
        <div className={styles.actionsGroup}>
          <Link to="/doctor/appointments" className={styles.primaryLink}>
            <CalendarCheck size={16} aria-hidden="true" />
            <span>
              Today&apos;s Queue {todayAppointmentsCount > 0 && `(${todayAppointmentsCount})`}
            </span>
          </Link>
          <Link to="/doctor/prescriptions" className={styles.secondaryLink}>
            <ClipboardList size={16} aria-hidden="true" />
            <span>Issued Prescriptions</span>
          </Link>
          <Link to="/communication" className={styles.secondaryLink}>
            <MessageSquare size={16} aria-hidden="true" />
            <span>Communication Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
