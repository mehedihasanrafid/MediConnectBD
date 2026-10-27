/**
 * Interactive doctor profile card: view & edit credentials, fees, specialties, and submit
 * draft/rejected applications for admin review.
 */

import { useState } from "react";
import { doctorsApi } from "../../../../api/doctors";
import { Alert, Badge, Button, Card, Field } from "../../../../components/ui";
import type { Specialty } from "../../../../shared/types";
import { getErrorMessage } from "../../../../shared/utils/apiError";
import { formatMoney } from "../../../../shared/utils/format";
import type { DoctorProfileDetails } from "../../types/doctorDashboard.types";
import {
  applicationStatusTone,
  parseCommaSeparatedLanguages,
} from "../../utils/doctorDashboard.utils";
import styles from "./DoctorProfileSection.module.css";

export function DoctorProfileSection({
  profile,
  allSpecialties,
  onProfileUpdated,
}: {
  profile: DoctorProfileDetails;
  allSpecialties: Specialty[];
  onProfileUpdated: (updated: DoctorProfileDetails) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [degrees, setDegrees] = useState(profile.degrees ?? "");
  const [experienceYears, setExperienceYears] = useState(String(profile.experienceYears ?? 0));
  const [videoFee, setVideoFee] = useState(
    profile.videoConsultationFee !== null ? String(profile.videoConsultationFee) : "800",
  );
  const [bio, setBio] = useState(profile.bio ?? "");
  const [languages, setLanguages] = useState(
    (profile.languages ?? ["Bangla", "English"]).join(", "),
  );
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState(
    profile.specialties[0]?.id ?? allSpecialties[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmitApplication =
    profile.applicationStatus === "DRAFT" || profile.applicationStatus === "REJECTED";

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const langs = parseCommaSeparatedLanguages(languages);
      const updated = await doctorsApi.updateMyProfile<DoctorProfileDetails>({
        degrees: degrees.trim() || null,
        experienceYears: Number(experienceYears) || 0,
        videoConsultationFee: videoFee.trim() ? Number(videoFee) : null,
        bio: bio.trim() || null,
        languages: langs,
        ...(selectedSpecialtyId ? { specialtyIds: [selectedSpecialtyId] } : {}),
      });
      onProfileUpdated(updated);
      setEditing(false);
      setNotice("Profile updated.");
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not update profile."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitApplication() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await doctorsApi.submitApplication<DoctorProfileDetails>();
      onProfileUpdated(updated);
      setNotice("Application submitted for administrator review.");
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not submit application for review."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Clinical profile & application</h2>
        <Badge tone={applicationStatusTone(profile.applicationStatus)}>
          {profile.applicationStatus.replaceAll("_", " ")}
        </Badge>
      </div>

      {profile.rejectionReason && (
        <Alert kind="error">Rejection reason: {profile.rejectionReason}</Alert>
      )}
      {profile.applicationStatus !== "APPROVED" && (
        <Alert kind="info">
          Only approved doctors appear in public search and can receive bookings.
        </Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {editing ? (
        <form onSubmit={handleSave} className={styles.formGrid}>
          <div className="filters">
            <Field label="Degrees & qualifications" value={degrees} onChange={setDegrees} required />
            <Field
              label="Experience (years)"
              value={experienceYears}
              onChange={setExperienceYears}
              type="number"
              required
            />
            <Field
              label="Video consultation fee (BDT)"
              value={videoFee}
              onChange={setVideoFee}
              type="number"
            />
          </div>
          <div className="filters">
            <label className="field">
              <span>Primary specialty</span>
              <select
                value={selectedSpecialtyId}
                onChange={(e) => setSelectedSpecialtyId(e.target.value)}
              >
                {allSpecialties.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Languages (comma-separated)"
              value={languages}
              onChange={setLanguages}
              placeholder="Bangla, English"
            />
          </div>
          <Field label="Short biography" value={bio} onChange={setBio} />
          <div className="row">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="facts">
            <div>
              <dt>Degrees</dt>
              <dd>{profile.degrees ?? "—"}</dd>
            </div>
            <div>
              <dt>Experience</dt>
              <dd>{profile.experienceYears} years</dd>
            </div>
            <div>
              <dt>Video fee</dt>
              <dd>{formatMoney(profile.videoConsultationFee)}</dd>
            </div>
            <div>
              <dt>Specialties</dt>
              <dd>{profile.specialties.map((s) => s.name).join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Chambers</dt>
              <dd>{profile.chambers.length}</dd>
            </div>
          </dl>
          {profile.bio && <p className="muted small">{profile.bio}</p>}

          <div className={styles.actions}>
            {profile.applicationStatus !== "PENDING_REVIEW" && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            )}
            {canSubmitApplication && (
              <Button disabled={busy} onClick={() => void handleSubmitApplication()}>
                {busy ? "Submitting…" : "Submit application for review"}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
