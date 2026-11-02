import { ArrowRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button } from "../../../../shared/ui";
import type { DoctorApplicationStatus } from "../../../dashboard/types/doctorDashboard.types";
import styles from "./ScheduleLockedBanner.module.css";

interface ScheduleLockedBannerProps {
  status: DoctorApplicationStatus;
}

export function ScheduleLockedBanner({ status }: ScheduleLockedBannerProps) {
  const statusLabels: Record<string, { label: string; tone: "warning" | "danger" | "neutral" }> = {
    PENDING_REVIEW: { label: "Under Administrator Review", tone: "warning" },
    REJECTED: { label: "Revisions Needed", tone: "danger" },
    DRAFT: { label: "Draft Application", tone: "neutral" },
  };

  const statusInfo = statusLabels[status] ?? { label: status, tone: "neutral" };

  return (
    <div className={styles.card} role="region" aria-label="Schedule Access Restricted">
      <div className={styles.iconWrap} aria-hidden="true">
        <Lock size={28} />
      </div>

      <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>

      <h2 className={styles.title}>Practice Schedule is Locked</h2>

      <p className={styles.description}>
        Consultation availability, weekly recurring hours, and slot generation are restricted to
        approved practitioners. Once MediConnect BD clinical administrators review and approve your
        qualifications, your full schedule and booking engine will be unlocked.
      </p>

      <div className={styles.actions}>
        <Button as="span" variant="primary">
          <Link
            to="/doctor/profile"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "inherit", textDecoration: "none" }}
          >
            <span>Complete Profile &amp; Application</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
