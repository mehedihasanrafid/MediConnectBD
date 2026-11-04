import { useEffect, useState } from "react";
import { useOptionalAuth } from "../../../features/auth/AuthContext";
import type { DoctorProfileData } from "../types/doctorProfile.types";
import { draftFromProfile, missingRequirements, profilePatch } from "../workspace/profileDraft";
import { useProfileSave } from "./useProfileSave";

export function useDoctorProfile(profile: DoctorProfileData, onSaved: (profile: DoctorProfileData) => void) {
  const auth = useOptionalAuth();
  const [draft, setDraft] = useState(() => draftFromProfile(profile));
  const dirty = Boolean(draft.photo) || Object.keys(profilePatch(profile, draft)).length > 0;
  const actions = useProfileSave(profile, (updated) => {
    setDraft(draftFromProfile(updated));
    onSaved(updated);
    auth?.syncDoctorProfile?.(updated);
  });
  const isReadOnly = profile.applicationStatus === "PENDING_REVIEW";
  const missing = missingRequirements(draft);
  const canSubmit = !dirty && !missing.length && ["DRAFT", "REJECTED"].includes(profile.applicationStatus);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return { draft, setDraft, dirty, isReadOnly, missing, canSubmit, ...actions,
    discard: () => { if (!actions.busy) { setDraft(draftFromProfile(profile)); actions.clearFeedback(); } } };
}
