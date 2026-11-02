import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, RotateCcw, Save, Send } from "lucide-react";
import { Alert, Button } from "../../shared/ui";
import { ChambersManager } from "./components/ChambersManager/ChambersManager";
import { ConsultationFeesSection } from "./components/ConsultationFeesSection/ConsultationFeesSection";
import { ProfessionalDetailsSection } from "./components/ProfessionalDetailsSection/ProfessionalDetailsSection";
import { ProfileCompletionChecklist } from "./components/ProfileCompletionChecklist/ProfileCompletionChecklist";
import { ProfilePageHeader } from "./components/ProfilePageHeader/ProfilePageHeader";
import { PublicProfilePreview } from "./components/PublicProfilePreview/PublicProfilePreview";
import { ReverificationWarningDialog } from "./components/ReverificationWarningDialog/ReverificationWarningDialog";
import { SpecialtiesSelector } from "./components/SpecialtiesSelector/SpecialtiesSelector";
import { useDoctorProfile } from "./hooks/useDoctorProfile";
import styles from "./DoctorProfilePage.module.css";

export function DoctorProfilePage() {
  const {
    profile,
    hospitals,
    specialties,
    loading,
    profileError,
    catalogError,

    // Form fields
    degrees,
    setDegrees,
    experienceYears,
    setExperienceYears,
    bio,
    setBio,
    languages,
    setLanguages,
    videoConsultationFee,
    setVideoConsultationFee,
    specialtyIds,
    chambers,

    // Actions
    toggleSpecialty,
    removeSpecialty,
    addChamber,
    editChamber,
    removeChamber,
    saveProfile,
    submitApplication,

    // Status
    isReadOnly,
    hasDegrees,
    hasSpecialties,
    hasConsultationFee,
    canSubmit,

    // Mutex & feedback
    saving,
    saveError,
    saveSuccess,
    submitting,
    submitError,
    submitSuccess,
    showReverificationModal,
    confirmReverificationSave,
    cancelReverificationSave,
    reload,
  } = useDoctorProfile();

  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  if (loading) {
    return (
      <div className={styles.loadingSkeleton} aria-busy="true" aria-label="Loading doctor profile">
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonBody} />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className={styles.container}>
        <Alert kind="error">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span>{profileError || "Unable to load doctor profile."}</span>
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => void reload()}>
                <RotateCcw size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
                <span>Retry Loading Profile</span>
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 1. Profile Page Header */}
      <ProfilePageHeader
        profile={profile}
        saving={saving}
        submitting={submitting}
        canSubmit={canSubmit}
        isReadOnly={isReadOnly}
        onSave={() => void saveProfile()}
        onSubmitForReview={() => void submitApplication()}
        onTogglePreview={() => setMobilePreviewOpen((prev) => !prev)}
        showPreviewToggle
        isPreviewVisible={mobilePreviewOpen}
      />

      {/* 2. Feedback Notifications */}
      {saveSuccess && (
        <Alert kind="success">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{saveSuccess}</span>
          </div>
        </Alert>
      )}

      {submitSuccess && (
        <Alert kind="success">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{submitSuccess}</span>
          </div>
        </Alert>
      )}

      {saveError && <Alert kind="error">{saveError}</Alert>}
      {submitError && <Alert kind="error">{submitError}</Alert>}
      {catalogError && <Alert kind="warning">{catalogError}</Alert>}

      {/* 3. Under Review Notice */}
      {isReadOnly && (
        <Alert kind="info">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
            <div>
              <strong>Application Under Review:</strong> Your profile is currently being reviewed by
              MediConnect BD clinical administrators. Modifications are disabled to maintain data
              integrity during the review process.
            </div>
          </div>
        </Alert>
      )}

      {/* 4. Onboarding Checklist for Draft / Rejected */}
      <ProfileCompletionChecklist
        profile={profile}
        hasDegrees={hasDegrees}
        hasSpecialties={hasSpecialties}
        hasConsultationFee={hasConsultationFee}
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmitForReview={() => void submitApplication()}
      />

      {/* 5. Main Workspace Grid */}
      <div className={styles.workspaceGrid}>
        {/* Editor Column */}
        <div className={styles.editorColumn}>
          {/* Section A: Professional Details & Bio */}
          <ProfessionalDetailsSection
            profile={profile}
            degrees={degrees}
            setDegrees={setDegrees}
            experienceYears={experienceYears}
            setExperienceYears={setExperienceYears}
            bio={bio}
            setBio={setBio}
            languages={languages}
            setLanguages={setLanguages}
            isReadOnly={isReadOnly}
          />

          {/* Section B: Clinical Specialties */}
          <SpecialtiesSelector
            specialties={specialties}
            selectedSpecialtyIds={specialtyIds}
            onToggleSpecialty={toggleSpecialty}
            onRemoveSpecialty={removeSpecialty}
            isReadOnly={isReadOnly}
            catalogError={catalogError}
          />

          {/* Section C: Practicing Chambers */}
          <ChambersManager
            chambers={chambers}
            hospitals={hospitals}
            onAddChamber={addChamber}
            onEditChamber={editChamber}
            onRemoveChamber={removeChamber}
            isReadOnly={isReadOnly}
            isSaving={saving}
            catalogError={catalogError}
          />

          {/* Section D: Consultation Fees & Telemedicine */}
          <ConsultationFeesSection
            videoConsultationFee={videoConsultationFee}
            setVideoConsultationFee={setVideoConsultationFee}
            chambers={chambers}
            isReadOnly={isReadOnly}
          />

          {/* Bottom Action Bar */}
          {!isReadOnly && (
            <div className={styles.bottomActionBar}>
              <span className={styles.bottomActionMessage}>
                {profile.applicationStatus === "APPROVED"
                  ? "Note: Saving modifications will return your profile to Draft for administrator re-verification."
                  : "Remember to save your changes when done."}
              </span>

              <div className={styles.bottomActionButtons}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => reload()}
                  disabled={saving || submitting}
                >
                  Discard Changes
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={saving}
                  onClick={() => void saveProfile()}
                >
                  <Save size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
                  <span>Save Changes</span>
                </Button>

                {canSubmit && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    onClick={() => void submitApplication()}
                  >
                    <Send size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
                    <span>Submit for Review</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview Column (Responsive) */}
        <div
          className={clsx(
            styles.previewColumn,
            !mobilePreviewOpen && styles.previewColumnHidden,
          )}
        >
          <PublicProfilePreview
            profile={profile}
            degrees={degrees}
            experienceYears={experienceYears}
            bio={bio}
            languages={languages}
            videoConsultationFee={videoConsultationFee}
            specialties={specialties}
            selectedSpecialtyIds={specialtyIds}
            chambers={chambers}
            hospitals={hospitals}
          />
        </div>
      </div>

      {/* 6. Reverification Confirmation Dialog for APPROVED Doctors */}
      <ReverificationWarningDialog
        open={showReverificationModal}
        onConfirm={() => void confirmReverificationSave()}
        onCancel={cancelReverificationSave}
        isSaving={saving}
      />
    </div>
  );
}
