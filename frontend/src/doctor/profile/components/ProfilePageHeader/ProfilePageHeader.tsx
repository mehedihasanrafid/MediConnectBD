import { Eye, Save, Send, ShieldCheck, Stethoscope } from "lucide-react";
import { Badge, Button } from "../../../../shared/ui";
import type { DoctorProfileData } from "../../types/doctorProfile.types";
import styles from "./ProfilePageHeader.module.css";

interface ProfilePageHeaderProps {
  profile: DoctorProfileData;
  saving?: boolean;
  submitting?: boolean;
  canSubmit?: boolean;
  isReadOnly?: boolean;
  onSave: () => void;
  onSubmitForReview: () => void;
  onTogglePreview?: () => void;
  showPreviewToggle?: boolean;
  isPreviewVisible?: boolean;
}

export function ProfilePageHeader({
  profile,
  saving = false,
  submitting = false,
  canSubmit = false,
  isReadOnly = false,
  onSave,
  onSubmitForReview,
  onTogglePreview,
  showPreviewToggle = false,
  isPreviewVisible = false,
}: ProfilePageHeaderProps) {
  const status = profile.applicationStatus;
  const statusBadgeInfo: Record<
    string,
    { label: string; tone: "success" | "warning" | "danger" | "neutral" }
  > = {
    APPROVED: { label: "Application Approved", tone: "success" },
    PENDING_REVIEW: { label: "Under Administrator Review", tone: "warning" },
    REJECTED: { label: "Revisions Requested", tone: "danger" },
    DRAFT: { label: "Draft Application", tone: "neutral" },
  };
  const currentBadge = statusBadgeInfo[status] ?? { label: status, tone: "neutral" as const };

  return (
    <header className={styles.header} aria-label="Profile and Practice Header">
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.heading}>Profile &amp; Practice</h1>
            <Badge tone={currentBadge.tone}>{currentBadge.label}</Badge>
          </div>
          <p className={styles.description}>
            Manage your medical credentials, clinical biography, practicing chambers, and patient consultation fees.
          </p>
        </div>

        <div className={styles.actionsArea}>
          {showPreviewToggle && onTogglePreview && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onTogglePreview}
              aria-label={isPreviewVisible ? "Hide public profile preview" : "Show public profile preview"}
            >
              <Eye size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>{isPreviewVisible ? "Hide Preview" : "Public Preview"}</span>
            </Button>
          )}

          {!isReadOnly && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={saving}
              onClick={onSave}
              aria-label="Save profile changes"
            >
              <Save size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>Save Changes</span>
            </Button>
          )}

          {canSubmit && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={onSubmitForReview}
              aria-label="Submit application for administrator review"
            >
              <Send size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
              <span>Submit for Review</span>
            </Button>
          )}
        </div>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>{`BMDC Registration: #${profile.bmdcNumber} (Read-only)`}</span>
        </span>

        {profile.specialties && profile.specialties.length > 0 && (
          <span className={styles.metaItem}>
            <Stethoscope size={14} aria-hidden="true" />
            <span>{`${profile.specialties.length} ${profile.specialties.length === 1 ? "Specialty" : "Specialties"} Configured`}</span>
          </span>
        )}
      </div>
    </header>
  );
}
