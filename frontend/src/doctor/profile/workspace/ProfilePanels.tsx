import type { useProfileResource } from "../hooks/useProfileResource";
import type { useDoctorProfile } from "../hooks/useDoctorProfile";
import type { DoctorChamberDetail, DoctorProfileData } from "../types/doctorProfile.types";
import { ChamberDialog } from "../components/ChambersManager/ChamberDialog";
import { ProfileEditor } from "./ProfileEditor";
import { ProfilePreviewDrawer } from "./ProfilePreviewDrawer";
import { PhotoDialog } from "./photo/PhotoDialog";
import { ProfileConfirmation } from "./ProfileConfirmations";
import type { Specialty } from "../../../shared/types";

export type ProfilePanel = { kind: "edit" | "preview" | "photo" | "discard" } |
  { kind: "chamber"; chamber: DoctorChamberDetail | null } | { kind: "remove-chamber"; chamber: DoctorChamberDetail } | null;
export function ProfilePanels({ panel, onChange, model, resource, profile, specialties }: {
  panel: ProfilePanel; onChange: (panel: ProfilePanel) => void; model: ReturnType<typeof useDoctorProfile>;
  resource: ReturnType<typeof useProfileResource>; profile: DoctorProfileData; specialties: Specialty[];
}) {
  const close = () => { onChange(null); requestAnimationFrame(() => document.getElementById("doctor-profile-title")?.focus()); };
  if (model.pending) return <ProfileConfirmation title="Save approved profile?"
    description="Saving returns your profile to Draft. Submit it for review afterwards. Your public listing and new bookings may pause until approval."
    confirmLabel="Save as draft" busy={model.busy} error={model.error} onClose={model.cancel}
    onConfirm={() => void model.confirm()} />;
  if (!panel) return null;
  if (panel.kind === "edit") return <ProfileEditor draft={model.draft} specialties={specialties}
    catalogLoading={resource.catalogLoading} catalogError={resource.catalogError} onRetry={() => void resource.loadCatalogs()}
    onApply={model.setDraft} onClose={close} />;
  if (panel.kind === "preview") return <ProfilePreviewDrawer profile={profile} draft={model.draft} specialties={specialties} onClose={close} />;
  if (panel.kind === "photo") return <PhotoDialog name={`Dr. ${profile.firstName ?? ""} ${profile.lastName ?? ""}`} draft={model.draft}
    onClose={close} onApply={(photo) => model.setDraft((draft) => ({ ...draft, photo }))}
    onRemove={() => model.setDraft((draft) => ({ ...draft, photo: null, photoUrl: null }))} />;
  if (panel.kind === "discard") return <ProfileConfirmation title="Discard changes?"
    description="Your profile will return to its last saved version." confirmLabel="Discard changes"
    onClose={close} onConfirm={() => { model.discard(); close(); }} />;
  if (panel.kind === "remove-chamber") return <ProfileConfirmation title="Remove chamber?"
    description="The chamber will be removed when you save changes. Existing appointments remain booked."
    confirmLabel="Remove chamber" onClose={close} onConfirm={() => {
      model.setDraft((draft) => ({ ...draft, chambers: draft.chambers.filter((chamber) => chamber.hospitalId !== panel.chamber.hospitalId) }));
      close();
    }} />;
  if (panel.kind !== "chamber") return null;
  const editing = panel.chamber;
  return <ChamberDialog open editingChamber={editing} hospitals={resource.hospitals} existingChambers={model.draft.chambers}
    catalogLoading={resource.catalogLoading} catalogError={resource.catalogError} onRetry={() => void resource.loadCatalogs()}
    onOpenChange={(open) => { if (!open) close(); }}
    onRemove={editing ? () => onChange({ kind: "remove-chamber", chamber: editing }) : undefined}
    onSave={async (values) => {
      const chamber: DoctorChamberDetail = { ...editing, hospitalId: values.hospitalId, roomOrUnit: values.roomOrUnit || null,
        consultationFee: Number(values.consultationFee), isActive: true,
        hospital: resource.hospitals.find((item) => item.id === values.hospitalId) ?? editing?.hospital };
      model.setDraft((draft) => ({ ...draft, chambers: editing
        ? draft.chambers.map((item) => item.hospitalId === editing.hospitalId ? chamber : item) : [...draft.chambers, chamber] }));
      return true;
    }} />;
}
