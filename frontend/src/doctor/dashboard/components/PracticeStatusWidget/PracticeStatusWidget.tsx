import { CheckCircle2, Settings, ShieldCheck } from "lucide-react";

import { formatMoney } from "../../../../shared/utils/format";
import { Badge, Button } from "../../../../shared/ui";
import { DoctorApprovalBanner } from "../DoctorApprovalBanner";
import type { ScheduleOverview } from "../DoctorScheduleSection";
import type { DoctorProfileDetails } from "../../types/doctorDashboard.types";
import styles from "./PracticeStatusWidget.module.css";

interface PracticeStatusWidgetProps {
  profile: DoctorProfileDetails;
  schedule?: ScheduleOverview | null;
  onOpenEditProfile: () => void;
  onProfileUpdated: (updated: DoctorProfileDetails) => void;
}

export function PracticeStatusWidget({
  profile,
  schedule,
  onOpenEditProfile,
  onProfileUpdated,
}: PracticeStatusWidgetProps) {
  // If unapproved, render the Phase 1 DoctorApprovalBanner directly
  if (profile.applicationStatus !== "APPROVED") {
    return (
      <DoctorApprovalBanner
        profile={profile}
        onProfileUpdated={onProfileUpdated}
        onOpenEditProfile={onOpenEditProfile}
      />
    );
  }

  const activeChambers = profile.chambers?.filter((c) => c.isActive).length ?? 0;
  const activeRules = schedule?.rules?.filter((r) => r.isActive).length ?? 0;

  return (
    <section className={styles.card} aria-label="Practice status and credentials">
      <div className={styles.headerRow}>
        <div className={styles.eyebrow}>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Practice Status</span>
        </div>
        <Badge tone="success">
          Application Approved
        </Badge>
      </div>

      <div className={styles.statusRow}>
        <div className={styles.statusIcon} aria-hidden="true">
          <CheckCircle2 size={20} />
        </div>
        <div className={styles.statusInfo}>
          <span className={styles.statusTitle}>Directory Listing Active</span>
          <span className={styles.statusDesc}>
            BMDC #{profile.bmdcNumber} · Verified Credentials
          </span>
        </div>
      </div>

      <div className={styles.metricsList}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Video Consult Fee</span>
          <span className={styles.metricValue}>
            {formatMoney(profile.videoConsultationFee)}
          </span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Active Chambers</span>
          <span className={styles.metricValue}>
            {activeChambers} {activeChambers === 1 ? "Chamber" : "Chambers"}
          </span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Weekly Rules</span>
          <span className={styles.metricValue}>
            {activeRules} {activeRules === 1 ? "Rule" : "Rules"} Active
          </span>
        </div>
      </div>

      <div className={styles.actionRow}>
        <Button size="sm" variant="secondary" onClick={onOpenEditProfile}>
          <Settings size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
          Edit Practice Profile &amp; Fees
        </Button>
      </div>
    </section>
  );
}
