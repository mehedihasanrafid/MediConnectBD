import { describe, expect, it } from "vitest";
import type { DoctorProfileData } from "../types/doctorProfile.types";
import { draftFromProfile, missingRequirements, profilePatch, validateProfileDraft } from "./profileDraft";

const profile: DoctorProfileData = { id: "doctor", bmdcNumber: "TEST", degrees: "MBBS", experienceYears: 10, bio: "Biography",
  languages: ["Bangla", "English"], videoConsultationFee: 0, photoUrl: null, applicationStatus: "APPROVED", rejectionReason: null,
  specialties: [{ id: "specialty", name: "Medicine", slug: "medicine" }], chambers: [
    { id: "active", hospitalId: "hospital", roomOrUnit: "402", consultationFee: 1000 },
    { id: "inactive", hospitalId: "old-hospital", consultationFee: 800, isActive: false },
  ] };
describe("Profile drafts and minimal patches", () => {
  it("recognizes a freshly loaded profile as unchanged, including zero fees", () => {
    const draft = draftFromProfile(profile);
    expect(draft.videoFee).toBe("0");
    expect(profilePatch(profile, draft)).toEqual({});
    expect(missingRequirements(draft)).toEqual([]);
    expect(draft.chambers.map((chamber) => chamber.id)).toEqual(["active"]);
  });
  it("changes only the edited fields and keeps unrelated chambers out of the request", () => {
    const draft = draftFromProfile(profile);
    draft.degrees = " Updated MBBS "; draft.languages = "Bangla, English, English, Hindi";
    expect(profilePatch(profile, draft)).toEqual({ degrees: "Updated MBBS", languages: ["Bangla", "English", "Hindi"] });
  });
  it("distinguishes clearing a video fee or photo from leaving them unchanged", () => {
    const original = { ...profile, photoUrl: "https://example.test/photo.webp" };
    const draft = draftFromProfile(original);
    draft.videoFee = ""; draft.photoUrl = null;
    expect(profilePatch(original, draft)).toEqual({ videoConsultationFee: null, photoUrl: null });
  });
  it("validates numeric ranges, language limits and unique chamber hospitals", () => {
    const draft = draftFromProfile(profile);
    draft.experienceYears = 1.5; expect(validateProfileDraft(draft)).toContain("whole number");
    draft.experienceYears = 10; draft.videoFee = "NaN"; expect(validateProfileDraft(draft)).toContain("Video fee");
    draft.videoFee = "0"; draft.chambers.push({ ...draft.chambers[0] });
    expect(validateProfileDraft(draft)).toContain("one chamber");
    draft.chambers.pop(); draft.languages = "a".repeat(51);
    expect(validateProfileDraft(draft)).toContain("languages");
  });
  it("reports submission requirements without inventing qualifications or consultation options", () => {
    const draft = draftFromProfile({ ...profile, degrees: null, specialties: [], chambers: [], videoConsultationFee: null });
    expect(missingRequirements(draft)).toEqual(["qualifications", "a specialty", "a consultation option"]);
  });
});
