import { useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Send,
  ShieldAlert,
} from "lucide-react";

import { doctorsApi } from "../../../../api/doctors";
import { Alert, Badge, Button, useToast } from "../../../../shared/ui";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatMoney } from "../../../../shared/utils/format";
import type { DoctorProfileDetails } from "../../types/doctorDashboard.types";
import styles from "./DoctorApprovalBanner.module.css";

interface DoctorApprovalBannerProps {
  profile: DoctorProfileDetails;
  onProfileUpdated: (updated: DoctorProfileDetails) => void;
  onOpenEditProfile?: () => void;
}

export function DoctorApprovalBanner({
  profile,
  onProfileUpdated,
  onOpenEditProfile,
}: DoctorApprovalBannerProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const status = profile.applicationStatus;

  // An approved doctor operates normally without this banner
  if (status === "APPROVED") {
    return null;
  }

  // Backend submission requirements (checked strictly against real profile data)
  const hasDegrees = Boolean(profile.degrees && profile.degrees.trim().length > 0);
  const hasSpecialties = Boolean(profile.specialties && profile.specialties.length > 0);
  const hasFee = Boolean(
    profile.videoConsultationFee !== null ||
      (profile.chambers && profile.chambers.some((c) => c.isActive)),
  );

  const satisfiedCount = [hasDegrees, hasSpecialties, hasFee].filter(Boolean).length;
  const canSubmit = hasDegrees && hasSpecialties && hasFee;

  const handleSubmit = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await doctorsApi.submitApplication<DoctorProfileDetails>();
      onProfileUpdated(updated);
      showToast("Application submitted successfully for administrator review.", {
        kind: "success",
      });
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not submit application for review."));
    } finally {
      setBusy(false);
    }
  };

  // State 1: DRAFT
  if (status === "DRAFT") {
    return (
      <section
        className={clsx(styles.bannerCard, styles.bannerDraft)}
        aria-label="Doctor Profile Completion & Application Status"
      >
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <div className={clsx(styles.iconWrap, styles.iconWrapDraft)} aria-hidden="true">
              <FileText size={18} />
            </div>
            <div>
              <h2 className={styles.title}>Complete Your Practitioner Application</h2>
              <p className={styles.subtitle}>
                Complete all required qualifications to submit your profile for clinical
                verification and public directory listing.
              </p>
            </div>
          </div>
          <Badge tone="neutral">Application Draft ({satisfiedCount}/3 Complete)</Badge>
        </div>

        {actionError && <Alert kind="error">{actionError}</Alert>}

        {/* Requirements Checklist */}
        <div className={styles.checklistGrid} role="list" aria-label="Application requirements checklist">
          <div className={styles.checklistItem} role="listitem">
            {hasDegrees ? (
              <CheckCircle2 size={16} color="var(--color-success)" className={styles.checklistIcon} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} color="var(--color-warning)" className={styles.checklistIcon} aria-hidden="true" />
            )}
            <div>
              <strong>Degrees & Credentials</strong>
              <div>{hasDegrees ? profile.degrees : "Missing medical degrees"}</div>
            </div>
          </div>

          <div className={styles.checklistItem} role="listitem">
            {hasSpecialties ? (
              <CheckCircle2 size={16} color="var(--color-success)" className={styles.checklistIcon} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} color="var(--color-warning)" className={styles.checklistIcon} aria-hidden="true" />
            )}
            <div>
              <strong>Clinical Specialties</strong>
              <div>
                {hasSpecialties
                  ? profile.specialties.map((s) => s.name).join(", ")
                  : "At least one specialty required"}
              </div>
            </div>
          </div>

          <div className={styles.checklistItem} role="listitem">
            {hasFee ? (
              <CheckCircle2 size={16} color="var(--color-success)" className={styles.checklistIcon} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} color="var(--color-warning)" className={styles.checklistIcon} aria-hidden="true" />
            )}
            <div>
              <strong>Consultation Fee</strong>
              <div>
                {hasFee
                  ? `Video: ${formatMoney(profile.videoConsultationFee)}`
                  : "Video fee or chamber fee required"}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionRow}>
          <span className={styles.helperText}>
            {canSubmit
              ? "All required fields are ready. Click Submit when you are ready for administrative review."
              : "Complete the missing fields in your profile before submitting."}
          </span>
          <div className={styles.actionButtons}>
            <Button variant="secondary" onClick={onOpenEditProfile}>
              <Edit3 size={14} aria-hidden="true" style={{ marginRight: 6 }} />
              Edit Profile Information
            </Button>
            <Button
              disabled={!canSubmit || busy}
              loading={busy}
              onClick={() => void handleSubmit()}
            >
              <Send size={14} aria-hidden="true" style={{ marginRight: 6 }} />
              Submit Application for Review
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // State 2: PENDING_REVIEW
  if (status === "PENDING_REVIEW") {
    return (
      <section
        className={clsx(styles.bannerCard, styles.bannerPending)}
        aria-label="Application Under Review"
      >
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <div className={clsx(styles.iconWrap, styles.iconWrapPending)} aria-hidden="true">
              <Clock size={18} />
            </div>
            <div>
              <h2 className={styles.title}>Application Under Administrator Review</h2>
              <p className={styles.subtitle}>
                Your application has been received and is actively being verified by the
                MediConnect BD clinical administration team.
              </p>
            </div>
          </div>
          <Badge tone="warning">Pending Review</Badge>
        </div>

        <Alert kind="info">
          Profile editing and weekly schedule management are paused while your application is under review.
          You will receive immediate access once approved.
        </Alert>

        {/* Read-Only Submitted Details Preview */}
        <div className={styles.detailsSummary}>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>BMDC Registration</span>
            <span className={styles.detailValue}>#{profile.bmdcNumber}</span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Degrees</span>
            <span className={styles.detailValue}>{profile.degrees ?? "—"}</span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Specialties</span>
            <span className={styles.detailValue}>
              {profile.specialties.map((s) => s.name).join(", ") || "—"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Experience</span>
            <span className={styles.detailValue}>{profile.experienceYears} Years</span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Video Consultation Fee</span>
            <span className={styles.detailValue}>{formatMoney(profile.videoConsultationFee)}</span>
          </div>
        </div>

        <div className={styles.actionRow}>
          <span className={styles.helperText}>
            Submitted profile is locked for review integrity. No further action is required from you.
          </span>
        </div>
      </section>
    );
  }

  // State 3: REJECTED
  if (status === "REJECTED") {
    return (
      <section
        className={clsx(styles.bannerCard, styles.bannerRejected)}
        aria-label="Application Revisions Required"
      >
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <div className={clsx(styles.iconWrap, styles.iconWrapRejected)} aria-hidden="true">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className={styles.title}>Application Returned — Revisions Required</h2>
              <p className={styles.subtitle}>
                The administrator has reviewed your application and requested revisions before
                approval can be granted.
              </p>
            </div>
          </div>
          <Badge tone="danger">Revisions Required</Badge>
        </div>

        {profile.rejectionReason ? (
          <Alert kind="error">
            <strong>Administrator Feedback:</strong> {profile.rejectionReason}
          </Alert>
        ) : (
          <Alert kind="error">
            Please update your profile details and credentials below, then resubmit for review.
          </Alert>
        )}

        {actionError && <Alert kind="error">{actionError}</Alert>}

        <div className={styles.actionRow}>
          <span className={styles.helperText}>
            {canSubmit
              ? "Ensure you address the administrator's feedback before resubmitting."
              : "Update the required fields before resubmitting."}
          </span>
          <div className={styles.actionButtons}>
            <Button variant="secondary" onClick={onOpenEditProfile}>
              <Edit3 size={14} aria-hidden="true" style={{ marginRight: 6 }} />
              Update Profile Details
            </Button>
            <Button
              disabled={!canSubmit || busy}
              loading={busy}
              onClick={() => void handleSubmit()}
            >
              <Send size={14} aria-hidden="true" style={{ marginRight: 6 }} />
              Resubmit Application
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
