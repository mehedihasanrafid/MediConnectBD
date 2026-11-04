import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Avatar } from "../../../shared/ui";
import { formatMoney } from "../../../shared/utils/format";
import type { DoctorProfileData } from "../types/doctorProfile.types";
import type { Specialty } from "../../../shared/types";
import type { ProfileDraft } from "./profileDraft";
import styles from "./ProfileWorkspace.module.css";

export function ProfilePreviewDrawer({ profile, draft, specialties, onClose }: {
  profile: DoctorProfileData; draft: ProfileDraft; specialties: Specialty[]; onClose: () => void;
}) {
  const name = `Dr. ${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.drawer}
      onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById("doctor-profile-title")?.focus(); }}>
      <div className={styles.row}><Dialog.Title>Patient preview</Dialog.Title>
        <Dialog.Close className={styles.close} aria-label="Close profile preview"><X size={18} aria-hidden="true" /></Dialog.Close></div>
      <Dialog.Description className={styles.muted}>Preview of your current edits. Save to publish them through the review process.</Dialog.Description>
      <div className={styles.stack}>
        <div className={styles.previewAvatar}><Avatar name={name} src={draft.photo?.preview ?? draft.photoUrl} size="xl" /></div>
        <div><h3>{name}</h3><p>{draft.degrees || "Qualifications not added"}</p>
          <p className={styles.muted}>{specialties.filter((item) => draft.specialtyIds.includes(item.id)).map((item) => item.name).join(" · ")}</p>
          <p className={styles.muted}>BMDC: {profile.bmdcNumber} · {draft.experienceYears} years</p></div>
        <p className={styles.name}>{draft.bio || "Biography not added."}</p>
        <p className={styles.muted}>Languages: {draft.languages || "Not added"}</p>
        <div className={styles.fee}><span>Video consultation</span>
          <strong>{draft.videoFee.trim() ? formatMoney(Number(draft.videoFee)) : "Not offered"}</strong></div>
        <h3>Chambers</h3>
        {!draft.chambers.length && <p className={styles.muted}>No chambers added.</p>}
        {draft.chambers.map((chamber) => <div className={styles.chamber} key={chamber.hospitalId}>
          <div><strong>{chamber.hospital?.name || "Hospital chamber"}</strong>
            <p className={styles.muted}>{[chamber.hospital?.address, chamber.roomOrUnit].filter(Boolean).join(" · ")}</p></div>
          <strong>{formatMoney(chamber.consultationFee)}</strong>
        </div>)}
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
