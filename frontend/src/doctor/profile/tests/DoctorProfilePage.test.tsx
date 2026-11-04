import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DoctorProfilePage } from "../DoctorProfilePage";
import { useProfileResource } from "../hooks/useProfileResource";
import type { DoctorProfileData } from "../types/doctorProfile.types";

vi.mock("../hooks/useProfileResource");
function profile(status: string = "APPROVED"): DoctorProfileData {
  return { id: "doctor", firstName: "Synthetic", lastName: "Doctor", bmdcNumber: "TEST-ONLY", degrees: "Synthetic MBBS",
    experienceYears: 10, bio: "Synthetic biography", languages: ["Bangla", "English"], videoConsultationFee: 800,
    applicationStatus: status, rejectionReason: null, photoUrl: "/api/v1/doctors/photos/00000000-0000-4000-8000-000000000099",
    specialties: [{ id: "medicine", name: "Medicine", slug: "medicine" }],
    chambers: [{ id: "chamber", hospitalId: "hospital", roomOrUnit: "Room 402", consultationFee: 1000,
      hospital: { id: "hospital", name: "Synthetic Hospital", area: "Dhaka", address: "Synthetic road", slug: "synthetic" } }] };
}
function render(data: DoctorProfileData | null, overrides: Partial<ReturnType<typeof useProfileResource>> = {}) {
  vi.mocked(useProfileResource).mockReturnValue({
    profile: data, setProfile: vi.fn(), hospitals: [], specialties: [], loading: false, error: null,
    catalogError: null, catalogLoading: false, loadCatalogs: vi.fn(), reload: vi.fn(), ...overrides,
  });
  return renderToString(<DoctorProfilePage />).replace(/<!--.*?-->/g, "");
}
describe("Profile & Chambers overview", () => {
  it("shows the doctor's actual summary, chambers and photo, with editors hidden", () => {
    const html = render(profile());
    for (const value of ["Profile &amp; Chambers", "Dr. Synthetic Doctor", "Synthetic MBBS", "Medicine", "Room 402", "Synthetic Hospital", "Approved"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain('src="/api/v1/doctors/photos/00000000-0000-4000-8000-000000000099"');
    expect(html).toContain("Change profile photo");
    for (const hidden of ['role="dialog"', "Save changes", "Remove chamber", "Choose specialties", "Live Patient Preview"]) {
      expect(html).not.toContain(hidden);
    }
    expect(html.match(/TEST-ONLY/g)).toHaveLength(1);
  });
  it("preserves read-only review status and hides submission controls", () => {
    const html = render(profile("PENDING_REVIEW"));
    expect(html).toContain("Under review");
    expect(html).toContain("Editing is paused");
    expect(html).not.toContain("Submit for review");
    expect(html).toMatch(/disabled=""[^>]*>Edit profile/);
  });
  it("shows incomplete submission requirements without inventing clinical information", () => {
    const data = { ...profile("DRAFT"), degrees: null, specialties: [], chambers: [], videoConsultationFee: null };
    const html = render(data);
    expect(html).toContain("qualifications, a specialty, a consultation option");
    expect(html).toContain("No specialty added");
    expect(html).toContain("Not offered");
    expect(html).toContain("No chambers added.");
    expect(html).not.toContain("General Practitioner");
    expect(html).not.toContain("BMDC Verified");
  });
  it("shows administrator feedback for a rejected profile", () => {
    expect(render({ ...profile("REJECTED"), rejectionReason: "Synthetic qualification feedback" })).toContain("Synthetic qualification feedback");
  });
  it("allows a saved, complete draft to be submitted explicitly", () => {
    const html = render(profile("DRAFT"));
    expect(html).toContain("Your profile is ready for review.");
    expect(html).toContain("Submit for review");
    expect(html).not.toContain("Unsaved changes");
  });
  it("handles loading and service failure without showing a false empty profile", () => {
    expect(render(null, { loading: true })).toContain("Loading profile");
    const html = render(null, { error: "Synthetic profile unavailable" });
    expect(html).toContain("Synthetic profile unavailable");
    expect(html).toContain("Retry");
    expect(html).not.toContain("Profile overview");
  });
  it("uses initials when there is no photo and preserves unknown status labels", () => {
    const html = render({ ...profile("Additional review"), photoUrl: null });
    expect(html).toContain("Additional review");
    expect(html).toContain("Add profile photo");
    expect(html).not.toContain("<img");
  });
});
