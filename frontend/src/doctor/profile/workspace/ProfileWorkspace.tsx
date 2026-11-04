import { useState } from "react";
import { Alert, Button } from "../../../shared/ui";
import { useDoctorProfile } from "../hooks/useDoctorProfile";
import type { useProfileResource } from "../hooks/useProfileResource";
import type { DoctorProfileData } from "../types/doctorProfile.types";
import { ProfileSummary } from "./ProfileSummary";
import { ChambersCard } from "./ChambersCard";
import { ProfileRequirements } from "./ProfileRequirements";
import { ProfilePanels, type ProfilePanel } from "./ProfilePanels";
import styles from "./ProfileWorkspace.module.css";

export function ProfileWorkspace({ profile, resource }: {
  profile: DoctorProfileData; resource: ReturnType<typeof useProfileResource>;
}) {
  const model = useDoctorProfile(profile, resource.setProfile);
  const [panel, setPanel] = useState<ProfilePanel>(null);
  const specialties = [...new Map([...profile.specialties, ...resource.specialties].map((item) => [item.id, item])).values()];
  const disabled = model.isReadOnly || model.busy;
  const edit = (next: ProfilePanel) => { setPanel(next); void resource.loadCatalogs(); };
  return <div className={styles.page}>
    <div className={styles.toolbar}><h1 id="doctor-profile-title" tabIndex={-1}>Profile &amp; Chambers</h1>
      <Button size="sm" variant="secondary" onClick={() => setPanel({ kind: "preview" })}>Preview</Button></div>
    {model.error && !model.pending && <Alert kind="error">{model.error}</Alert>}
    {model.notice && <Alert kind="success">{model.notice}</Alert>}
    <ProfileRequirements profile={profile} missing={model.missing} canSubmit={model.canSubmit}
      dirty={model.dirty} busy={model.busy} onSubmit={() => void model.submit()} />
    <ProfileSummary profile={profile} draft={model.draft} specialties={specialties} disabled={disabled}
      onEdit={() => edit({ kind: "edit" })} onPhoto={() => setPanel({ kind: "photo" })} />
    <ChambersCard chambers={model.draft.chambers} hospitals={resource.hospitals} disabled={disabled}
      onEdit={(chamber) => edit({ kind: "chamber", chamber })} />
    {model.dirty && !model.isReadOnly && <div className={styles.saveBar} role="region" aria-label="Unsaved profile changes">
      <p>Unsaved changes</p><div className={styles.actions}>
        <Button size="sm" variant="secondary" disabled={model.busy} onClick={() => setPanel({ kind: "discard" })}>Discard</Button>
        <Button size="sm" loading={model.busy} onClick={() => void model.save(model.draft)}>Save changes</Button>
      </div>
    </div>}
    <ProfilePanels panel={panel} onChange={setPanel} model={model} resource={resource} profile={profile} specialties={specialties} />
  </div>;
}
