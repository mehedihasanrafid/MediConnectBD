import { Lock } from "lucide-react";
import { Field, FormField, Textarea } from "../../../../shared/ui";
import type { DoctorProfileData } from "../../types/doctorProfile.types";
import styles from "./ProfessionalDetailsSection.module.css";

interface ProfessionalDetailsSectionProps {
  profile: DoctorProfileData;
  degrees: string;
  setDegrees: (val: string) => void;
  experienceYears: number;
  setExperienceYears: (val: number) => void;
  bio: string;
  setBio: (val: string) => void;
  languages: string[];
  setLanguages: (val: string[]) => void;
  isReadOnly?: boolean;
}

export function ProfessionalDetailsSection({
  profile,
  degrees,
  setDegrees,
  experienceYears,
  setExperienceYears,
  bio,
  setBio,
  languages,
  setLanguages,
  isReadOnly = false,
}: ProfessionalDetailsSectionProps) {
  const languageInputString = languages.join(", ");

  const handleLanguageChange = (val: string) => {
    const list = val
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    setLanguages(list.length > 0 ? list : ["Bangla"]);
  };

  return (
    <section className={styles.section} aria-label="Professional Details and Credentials">
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>Professional Details &amp; Biography</h2>
          <p className={styles.subheading}>
            Update your medical qualifications, clinical biography, and languages for patients.
          </p>
        </div>
      </div>

      {/* Read-only Identity Banner */}
      <div className={styles.identityBanner}>
        <div className={styles.identityItem}>
          <span className={styles.identityLabel}>Registered Practitioner</span>
          <span className={styles.identityValue}>
            <Lock size={12} className={styles.lockIcon} aria-hidden="true" />
            <span>{`Dr. ${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()}</span>
          </span>
        </div>

        <div className={styles.identityItem}>
          <span className={styles.identityLabel}>BMDC Registration Number</span>
          <span className={styles.identityValue}>
            <Lock size={12} className={styles.lockIcon} aria-hidden="true" />
            <span>{`#${profile.bmdcNumber}`}</span>
          </span>
        </div>

        <div className={styles.identityItem}>
          <span className={styles.identityLabel}>Registered Account Email</span>
          <span className={styles.identityValue}>
            <Lock size={12} className={styles.lockIcon} aria-hidden="true" />
            <span>{profile.email ?? "Doctor Account"}</span>
          </span>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.twoCol} style={{ display: "grid", gap: "var(--space-4)" }}>
          <div>
            <Field
              label="Degrees & Medical Qualifications"
              value={degrees}
              onChange={setDegrees}
              placeholder="e.g. MBBS (DMC), FCPS (Medicine), MD (Cardiology)"
              required
              disabled={isReadOnly}
              hint="List all verified diplomas and degrees separated by commas."
            />
            <div className={styles.charCount}>{degrees.length} / 500 characters</div>
          </div>

          <div>
            <Field
              label="Clinical Experience (Years)"
              value={String(experienceYears)}
              onChange={(val) => setExperienceYears(Math.max(0, Math.min(80, Number(val) || 0)))}
              type="number"
              placeholder="0"
              required
              disabled={isReadOnly}
              hint="Total years practicing post-BMDC full registration."
            />
          </div>
        </div>

        <div>
          <Field
            label="Consultation Languages"
            value={languageInputString}
            onChange={handleLanguageChange}
            placeholder="e.g. Bangla, English"
            disabled={isReadOnly}
            hint="Enter languages you use during consultation, separated by commas (max 10)."
          />
        </div>

        <div>
          <FormField
            label="Professional Biography"
            hint="Summarize your clinical focus, hospital positions, and patient approach."
          >
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a brief professional overview for patients..."
              rows={4}
              disabled={isReadOnly}
              maxLength={5000}
            />
          </FormField>
          <div className={styles.charCount}>{bio.length} / 5,000 characters</div>
        </div>
      </div>
    </section>
  );
}
