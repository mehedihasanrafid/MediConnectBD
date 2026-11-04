import type { DoctorProfileData, DoctorProfilePatchPayload, DoctorChamberDetail } from "../types/doctorProfile.types";

export interface PhotoDraft { preview: string; mimeType: string; contentBase64: string }
export interface ProfileDraft {
  degrees: string; experienceYears: number; bio: string; languages: string; videoFee: string;
  specialtyIds: string[]; chambers: DoctorChamberDetail[]; photoUrl: string | null; photo: PhotoDraft | null;
}
export function draftFromProfile(profile: DoctorProfileData): ProfileDraft {
  return {
    degrees: profile.degrees ?? "", experienceYears: profile.experienceYears ?? 0, bio: profile.bio ?? "",
    languages: (profile.languages ?? []).join(", "), videoFee: profile.videoConsultationFee == null ? "" : String(profile.videoConsultationFee),
    specialtyIds: profile.specialties.map((specialty) => specialty.id),
    chambers: profile.chambers.filter((chamber) => chamber.isActive !== false).map((chamber) => ({
      ...chamber, hospitalId: chamber.hospitalId || chamber.hospital?.id || "",
    })),
    photoUrl: profile.photoUrl ?? null, photo: null,
  };
}
export function profilePayload(draft: ProfileDraft): DoctorProfilePatchPayload {
  return {
    degrees: draft.degrees.trim() || null, experienceYears: draft.experienceYears, bio: draft.bio.trim() || null,
    languages: [...new Set(draft.languages.split(",").map((language) => language.trim()).filter(Boolean))],
    videoConsultationFee: draft.videoFee.trim() === "" ? null : Number(draft.videoFee),
    specialtyIds: [...new Set(draft.specialtyIds)].sort(), photoUrl: draft.photoUrl,
    chambers: draft.chambers.map((chamber) => ({ hospitalId: chamber.hospitalId,
      roomOrUnit: chamber.roomOrUnit?.trim() || null, consultationFee: Number(chamber.consultationFee) })),
  };
}
/** Patch changed fields only: editing a fee must not replace unrelated chambers. */
export function profilePatch(profile: DoctorProfileData, draft: ProfileDraft): DoctorProfilePatchPayload {
  const before = profilePayload(draftFromProfile(profile)), after = profilePayload(draft);
  return Object.fromEntries(Object.entries(after).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(before[key as keyof DoctorProfilePatchPayload])));
}
export function validateProfileDraft(draft: ProfileDraft): string | null {
  const payload = profilePayload(draft);
  if (draft.degrees.length > 500) return "Keep qualifications within 500 characters.";
  if (draft.bio.length > 5000) return "Keep the biography within 5,000 characters.";
  if (!Number.isInteger(draft.experienceYears) || draft.experienceYears < 0 || draft.experienceYears > 80) return "Experience must be a whole number from 0 to 80.";
  if (draft.videoFee.trim() && (!Number.isFinite(Number(draft.videoFee)) || Number(draft.videoFee) < 0 || Number(draft.videoFee) > 1000000)) return "Video fee must be between 0 and 1,000,000 BDT.";
  if (payload.languages!.length > 10 || payload.languages!.some((language) => language.length > 50)) return "Use up to 10 languages, each within 50 characters.";
  if (draft.specialtyIds.length > 10) return "Choose up to 10 specialties.";
  if (draft.chambers.length > 20) return "Use up to 20 chambers.";
  if (new Set(draft.chambers.map((chamber) => chamber.hospitalId)).size !== draft.chambers.length) return "Each hospital can have one chamber.";
  for (const chamber of draft.chambers) {
    if (!chamber.hospitalId) return "Select a hospital for each chamber.";
    if ((chamber.roomOrUnit?.trim().length ?? 0) > 120) return "Keep the room or unit within 120 characters.";
    if (!Number.isFinite(Number(chamber.consultationFee)) || chamber.consultationFee < 0 || chamber.consultationFee > 1000000) return "Chamber fee must be between 0 and 1,000,000 BDT.";
  }
  return null;
}
export function missingRequirements(draft: ProfileDraft): string[] {
  return [!draft.degrees.trim() && "qualifications", !draft.specialtyIds.length && "a specialty",
    draft.videoFee.trim() === "" && !draft.chambers.length && "a consultation option"].filter(Boolean) as string[];
}
