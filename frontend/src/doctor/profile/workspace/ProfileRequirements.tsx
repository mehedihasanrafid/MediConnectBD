import { Alert, Button } from "../../../shared/ui";
import type { DoctorProfileData } from "../types/doctorProfile.types";
import styles from "./ProfileWorkspace.module.css";

export function ProfileRequirements({ profile, missing, dirty, canSubmit, busy, onSubmit }: {
  profile: DoctorProfileData; missing: string[]; dirty: boolean; canSubmit: boolean; busy: boolean; onSubmit: () => void;
}) {
  if (profile.applicationStatus === "PENDING_REVIEW") return <Alert kind="info">Under review. Editing is paused until the review is complete.</Alert>;
  if (!["DRAFT", "REJECTED"].includes(profile.applicationStatus)) return null;
  return <div className={styles.stack}>
    {profile.applicationStatus === "REJECTED" && profile.rejectionReason &&
      <Alert kind="error">{profile.rejectionReason}</Alert>}
    <div className={styles.saveBar}>
      <p>{missing.length ? `To submit, add ${missing.join(", ")}.` : dirty ? "Save your changes before submitting." : "Your profile is ready for review."}</p>
      <Button size="sm" disabled={!canSubmit || busy} loading={busy} onClick={onSubmit}>Submit for review</Button>
    </div>
  </div>;
}
