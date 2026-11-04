import { Camera } from "lucide-react";
import { Avatar, Badge, Button } from "../../../shared/ui";
import { formatMoney } from "../../../shared/utils/format";
import type { DoctorProfileData } from "../types/doctorProfile.types";
import type { Specialty } from "../../../shared/types";
import type { ProfileDraft } from "./profileDraft";
import styles from "./ProfileWorkspace.module.css";

const profileStatuses = {
  APPROVED: { label: "Approved", tone: "success" }, DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "Under review", tone: "warning" }, REJECTED: { label: "Changes requested", tone: "danger" },
} as const;
export function ProfileSummary({ profile, draft, specialties, disabled, onEdit, onPhoto }: {
  profile: DoctorProfileData; draft: ProfileDraft; specialties: Specialty[]; disabled: boolean;
  onEdit: () => void; onPhoto: () => void;
}) {
  const name = `Dr. ${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  const selected = draft.specialtyIds.map((id) => specialties.find((item) => item.id === id)?.name).filter(Boolean);
  const status = profileStatuses[profile.applicationStatus as keyof typeof profileStatuses] ??
    { label: profile.applicationStatus, tone: "neutral" as const };
  return <section className={styles.card} aria-label="Profile overview">
    <div className={styles.row}>
      <div className={styles.identity}>
        <button className={styles.photoButton} type="button" disabled={disabled} onClick={onPhoto}
          aria-label={draft.photo || draft.photoUrl ? "Change profile photo" : "Add profile photo"}>
          <Avatar name={name} src={draft.photo?.preview ?? draft.photoUrl} size="lg" />
          {!disabled && <Camera className={styles.camera} size={22} aria-hidden="true" />}
        </button>
        <div><div className={styles.heading}><h2 className={styles.name}>{name}</h2>
          <Badge tone={status.tone}>{status.label}</Badge></div>
          <p className={styles.muted}>{selected.join(" · ") || "No specialty added"}</p>
          <p className={styles.muted}>BMDC: {profile.bmdcNumber}</p>
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={onEdit} disabled={disabled}>Edit profile</Button>
    </div>
    <dl className={styles.facts}>
      <div><dt>Qualifications</dt><dd>{draft.degrees.trim() || "Not added"}</dd></div>
      <div><dt>Experience</dt><dd>{draft.experienceYears} years</dd></div>
      <div><dt>Languages</dt><dd>{draft.languages || "Not added"}</dd></div>
    </dl>
    {draft.bio.trim() && <p className={styles.bio}>{draft.bio}</p>}
    <div className={styles.fee}><span>Video consultation</span>
      <strong>{draft.videoFee.trim() ? formatMoney(Number(draft.videoFee)) : "Not offered"}</strong>
    </div>
  </section>;
}
