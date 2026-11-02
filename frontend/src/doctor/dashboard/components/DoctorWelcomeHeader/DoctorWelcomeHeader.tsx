import { Calendar, CalendarDays, ShieldCheck } from "lucide-react";

import type { PublicUser } from "../../../../shared/types";
import { Badge, Button } from "../../../../shared/ui";
import type { DoctorProfileDetails } from "../../types/doctorDashboard.types";
import styles from "./DoctorWelcomeHeader.module.css";

interface DoctorWelcomeHeaderProps {
  user: PublicUser | null;
  profile: DoctorProfileDetails;
  isApproved?: boolean;
  onViewSchedule: () => void;
}

export function DoctorWelcomeHeader({
  user,
  profile,
  isApproved = true,
  onViewSchedule,
}: DoctorWelcomeHeaderProps) {
  // Determine greeting based on Asia/Dhaka hour
  const now = new Date();
  const dhakaHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );

  let greeting = "Welcome";
  if (dhakaHour >= 5 && dhakaHour < 12) {
    greeting = "Good morning";
  } else if (dhakaHour >= 12 && dhakaHour < 17) {
    greeting = "Good afternoon";
  } else if (dhakaHour >= 17) {
    greeting = "Good evening";
  }

  const doctorName = user ? `Dr. ${user.firstName} ${user.lastName}` : "Doctor";

  const dhakaDateFormatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "full",
  }).format(now);

  const specialtiesSummary = profile.specialties?.map((s) => s.name).join(", ") || "";

  return (
    <header className={styles.header} aria-label="Doctor portal welcome and clinical summary">
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <div className={styles.greetingRow}>
            <h1 className={styles.heading}>
              {greeting}, {doctorName}
            </h1>
            <span className={styles.dateBadge}>
              <Calendar size={12} aria-hidden="true" />
              <span>{dhakaDateFormatted}</span>
            </span>
          </div>

          <p className={styles.description}>
            Clinical command center. Monitor appointments, review live patient queue, and coordinate daily consultations.
          </p>
        </div>

        <div className={styles.actionsArea}>
          <Button
            size="sm"
            variant="secondary"
            onClick={onViewSchedule}
            aria-label="View doctor weekly schedule"
          >
            <CalendarDays size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
            <span>View Schedule</span>
          </Button>
        </div>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaChip}>
          <ShieldCheck
            size={13}
            style={{ color: isApproved ? "var(--color-success)" : "var(--color-warning)" }}
            aria-hidden="true"
          />
          <span>BMDC Registration: #{profile.bmdcNumber}</span>
        </span>

        {specialtiesSummary && (
          <span className={styles.metaChip}>
            <span>{`Specialty: ${specialtiesSummary}`}</span>
          </span>
        )}

        {profile.degrees && (
          <span className={styles.metaChip}>
            <span>{`Credentials: ${profile.degrees}`}</span>
          </span>
        )}

        <Badge tone={isApproved ? "success" : "warning"}>
          {isApproved ? "Application Approved" : "Verification Pending"}
        </Badge>
      </div>
    </header>
  );
}
