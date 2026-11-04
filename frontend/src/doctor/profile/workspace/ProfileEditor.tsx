import { useState } from "react";
import { Alert, Button, Dialog, DialogContent, Field, FormField, Input, Textarea } from "../../../shared/ui";
import type { Specialty } from "../../../shared/types";
import { validateProfileDraft, type ProfileDraft } from "./profileDraft";
import { SpecialtyPicker } from "./SpecialtyPicker";
import styles from "./ProfileWorkspace.module.css";

export function ProfileEditor({ draft, specialties, catalogLoading, catalogError, onRetry, onApply, onClose }: {
  draft: ProfileDraft; specialties: Specialty[]; catalogLoading: boolean; catalogError: string | null;
  onRetry: () => void; onApply: (draft: ProfileDraft) => void; onClose: () => void;
}) {
  const [values, setValues] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const update = (patch: Partial<ProfileDraft>) => setValues((current) => ({ ...current, ...patch }));
  function apply(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateProfileDraft(values);
    setError(validation);
    if (!validation) { onApply(values); onClose(); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent title="Edit profile" description="Apply edits here, then save changes on your profile."
      footer={<div className={styles.actions}><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="edit-doctor-profile">Apply changes</Button></div>}>
      <form id="edit-doctor-profile" className={styles.stack} onSubmit={apply}>
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="Qualifications" value={values.degrees} onChange={(degrees) => update({ degrees })} />
        <div className={styles.fields}>
          <FormField label="Experience (years)"><Input type="number" min={0} max={80} step={1}
            value={values.experienceYears} onChange={(event) => update({ experienceYears: Number(event.target.value) })} /></FormField>
          <FormField label="Video fee (BDT)" hint="Blank = not offered."><Input type="number" min={0} max={1000000} step="0.01"
            value={values.videoFee} onChange={(event) => update({ videoFee: event.target.value })} /></FormField>
        </div>
        <Field label="Languages" value={values.languages} onChange={(languages) => update({ languages })} placeholder="Bangla, English" />
        <FormField label="Biography"><Textarea rows={4} maxLength={5000} value={values.bio}
          onChange={(event) => update({ bio: event.target.value })} /></FormField>
        {catalogError && <Alert kind="warning"><div className={styles.row}>{catalogError}
          <Button size="sm" variant="ghost" onClick={onRetry} disabled={catalogLoading}>Retry catalogs</Button></div></Alert>}
        <SpecialtyPicker items={specialties} selected={values.specialtyIds} loading={catalogLoading}
          onChange={(specialtyIds) => update({ specialtyIds })} />
      </form>
    </DialogContent>
  </Dialog>;
}
