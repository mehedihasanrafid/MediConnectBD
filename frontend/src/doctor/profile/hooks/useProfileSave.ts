import { useRef, useState } from "react";
import { doctorsApi } from "../../../api/doctors";
import { api } from "../../../api/client";
import { getErrorMessage } from "../../../shared/utils/apiError";
import type { DoctorProfileData } from "../types/doctorProfile.types";
import { profilePatch, validateProfileDraft, type ProfileDraft } from "../workspace/profileDraft";

export function useProfileSave(profile: DoctorProfileData | null, onSaved: (profile: DoctorProfileData) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<ProfileDraft | null>(null);
  const mutex = useRef(false);
  const uploaded = useRef<{ photo: ProfileDraft["photo"]; url: string } | null>(null);
  async function execute(draft: ProfileDraft) {
    if (!profile || mutex.current) return false;
    mutex.current = true; setBusy(true); setError(null); setNotice(null);
    try {
      const patch = profilePatch(profile, draft);
      if (draft.photo) {
        if (uploaded.current?.photo !== draft.photo) {
          const result = await api.post<{ photoUrl: string }>("/doctors/me/photo", {
            mimeType: draft.photo.mimeType, contentBase64: draft.photo.contentBase64,
          });
          uploaded.current = { photo: draft.photo, url: result.photoUrl };
        }
        patch.photoUrl = uploaded.current!.url;
      }
      if (!Object.keys(patch).length) { setPending(null); return true; }
      const updated = await doctorsApi.updateMyProfile<DoctorProfileData>(patch);
      onSaved(updated); setPending(null); uploaded.current = null; setNotice("Profile saved.");
      return true;
    } catch (caught) { setError(getErrorMessage(caught, "Could not save your profile. Your changes are kept.")); return false; }
    finally { mutex.current = false; setBusy(false); }
  }
  async function save(draft: ProfileDraft) {
    setError(null); setNotice(null);
    if (!profile || profile.applicationStatus === "PENDING_REVIEW" || mutex.current) return false;
    const validation = validateProfileDraft(draft);
    if (validation) { setError(validation); return false; }
    if (profile.applicationStatus === "APPROVED") { setPending(draft); return false; }
    return execute(draft);
  }
  async function submit() {
    if (!profile || mutex.current) return false;
    mutex.current = true; setBusy(true); setError(null); setNotice(null);
    try {
      onSaved(await doctorsApi.submitApplication<DoctorProfileData>());
      setNotice("Profile submitted for review."); return true;
    } catch (caught) { setError(getErrorMessage(caught, "Could not submit your profile.")); return false; }
    finally { mutex.current = false; setBusy(false); }
  }
  return { busy, error, notice, pending, save, submit,
    clearFeedback: () => { setError(null); setNotice(null); uploaded.current = null; },
    confirm: () => pending ? execute(pending) : Promise.resolve(false),
    cancel: () => { if (!mutex.current) { setPending(null); setError(null); } } };
}
