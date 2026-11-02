import clsx from "clsx";
import { AlertCircle, CheckCircle2, CircleDashed, Send } from "lucide-react";
import { Alert, Badge, Button } from "../../../../shared/ui";
import type { DoctorProfileData } from "../../types/doctorProfile.types";
import styles from "./ProfileCompletionChecklist.module.css";

interface ProfileCompletionChecklistProps {
  profile: DoctorProfileData;
  hasDegrees: boolean;
  hasSpecialties: boolean;
  hasConsultationFee: boolean;
  canSubmit: boolean;
  submitting?: boolean;
  onSubmitForReview: () => void;
}

export function ProfileCompletionChecklist({
  profile,
  hasDegrees,
  hasSpecialties,
  hasConsultationFee,
  canSubmit,
  submitting = false,
  onSubmitForReview,
}: ProfileCompletionChecklistProps) {
  const isRejected = profile.applicationStatus === "REJECTED";
  const isDraft = profile.applicationStatus === "DRAFT";

  if (!isDraft && !isRejected) {
    return null;
  }

  const completedCount = [hasDegrees, hasSpecialties, hasConsultationFee].filter(Boolean).length;

  return (
    <section className={styles.card} aria-label="Onboarding Requirements Checklist">
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>
          {isRejected ? "Application Revisions Required" : "Application Completion Checklist"}
        </h2>
        <Badge tone={completedCount === 3 ? "success" : "warning"}>
          {`${completedCount} of 3 Steps Completed`}
        </Badge>
      </div>

      {isRejected && profile.rejectionReason && (
        <Alert kind="error">
          <strong>Administrator Feedback:</strong> {profile.rejectionReason}
        </Alert>
      )}

      <div className={styles.checklistGrid}>
        {/* Step 1: Degrees */}
        <div
          className={clsx(
            styles.checklistItem,
            hasDegrees && styles.checklistItemComplete,
          )}
        >
          <div className={styles.iconWrap}>
            {hasDegrees ? (
              <CheckCircle2 size={16} className={styles.iconSuccess} aria-hidden="true" />
            ) : (
              <CircleDashed size={16} className={styles.iconPending} aria-hidden="true" />
            )}
          </div>
          <div className={styles.itemText}>
            <span className={styles.itemLabel}>1. Medical Qualifications</span>
            <span className={styles.itemDesc}>
              {hasDegrees ? profile.degrees : "Add medical degrees (e.g. MBBS, FCPS)"}
            </span>
          </div>
        </div>

        {/* Step 2: Specialties */}
        <div
          className={clsx(
            styles.checklistItem,
            hasSpecialties && styles.checklistItemComplete,
          )}
        >
          <div className={styles.iconWrap}>
            {hasSpecialties ? (
              <CheckCircle2 size={16} className={styles.iconSuccess} aria-hidden="true" />
            ) : (
              <CircleDashed size={16} className={styles.iconPending} aria-hidden="true" />
            )}
          </div>
          <div className={styles.itemText}>
            <span className={styles.itemLabel}>2. Clinical Specialty</span>
            <span className={styles.itemDesc}>
              {hasSpecialties
                ? `${profile.specialties.length} specialty selected`
                : "Select at least one specialty"}
            </span>
          </div>
        </div>

        {/* Step 3: Consultation Option */}
        <div
          className={clsx(
            styles.checklistItem,
            hasConsultationFee && styles.checklistItemComplete,
          )}
        >
          <div className={styles.iconWrap}>
            {hasConsultationFee ? (
              <CheckCircle2 size={16} className={styles.iconSuccess} aria-hidden="true" />
            ) : (
              <CircleDashed size={16} className={styles.iconPending} aria-hidden="true" />
            )}
          </div>
          <div className={styles.itemText}>
            <span className={styles.itemLabel}>3. Consultation Fee</span>
            <span className={styles.itemDesc}>
              {hasConsultationFee
                ? "Fee configured"
                : "Add video consult fee or active chamber"}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.actionRow}>
        <span className={styles.statusMessage}>
          {canSubmit ? (
            "All onboarding criteria are fulfilled. You may submit your profile for review."
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={14} className={styles.iconPending} aria-hidden="true" />
              <span>Complete the missing items above before submitting for review.</span>
            </span>
          )}
        </span>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canSubmit || submitting}
          loading={submitting}
          onClick={onSubmitForReview}
          aria-label="Submit application for review"
        >
          <Send size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
          <span>Submit Application for Review</span>
        </Button>
      </div>
    </section>
  );
}
