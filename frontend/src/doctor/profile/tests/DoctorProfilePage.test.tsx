import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { Hospital, Specialty } from "../../../shared/types";
import { DoctorHeader } from "../../navigation/DoctorHeader";
import { DoctorSidebar } from "../../navigation/DoctorSidebar";
import { ChambersManager } from "../components/ChambersManager/ChambersManager";
import { RemoveChamberDialog } from "../components/ChambersManager/RemoveChamberDialog";
import { ConsultationFeesSection } from "../components/ConsultationFeesSection/ConsultationFeesSection";
import { ProfessionalDetailsSection } from "../components/ProfessionalDetailsSection/ProfessionalDetailsSection";
import { ProfileCompletionChecklist } from "../components/ProfileCompletionChecklist/ProfileCompletionChecklist";
import { ProfilePageHeader } from "../components/ProfilePageHeader/ProfilePageHeader";
import { PublicProfilePreview } from "../components/PublicProfilePreview/PublicProfilePreview";
import { ReverificationWarningDialog } from "../components/ReverificationWarningDialog/ReverificationWarningDialog";
import { SpecialtiesSelector } from "../components/SpecialtiesSelector/SpecialtiesSelector";
import type { DoctorProfileData } from "../types/doctorProfile.types";

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open !== false ? <div>{children}</div> : null,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Overlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div role="dialog" className={className}>{children}</div>
  ),
  Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  Description: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
  Close: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button type="button" className={className}>{children}</button>
  ),
  Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      firstName: "Mahmudur",
      lastName: "Rahman",
      roles: ["DOCTOR"],
      email: "mahmudur@mediconnect.bd",
      doctorProfile: { id: "doc-1", applicationStatus: "APPROVED" },
    },
    loading: false,
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("Doctor Profile, Chambers & Fees (Phase 3)", () => {
  const dummySpecialties: Specialty[] = [
    { id: "s-1", name: "Cardiology", slug: "cardiology" },
    { id: "s-2", name: "Internal Medicine", slug: "internal-medicine" },
    { id: "s-3", name: "Pediatrics", slug: "pediatrics" },
  ];

  const dummyHospitals: Hospital[] = [
    {
      id: "h-1",
      name: "Square Hospital",
      slug: "square-hospital",
      area: "Panthapath",
      address: "18/F Bir Uttam Qazi Nuruzzaman Sarak, Dhaka 1205",
    },
    {
      id: "h-2",
      name: "Evercare Hospital Dhaka",
      slug: "evercare-dhaka",
      area: "Bashundhara",
      address: "Plot 81, Block E, Bashundhara R/A, Dhaka 1229",
    },
  ];

  const baseProfile: DoctorProfileData = {
    id: "doc-1",
    userId: "u-1",
    firstName: "Mahmudur",
    lastName: "Rahman",
    email: "mahmudur@mediconnect.bd",
    bmdcNumber: "A-54321",
    degrees: "MBBS (DMC), FCPS (Cardiology)",
    experienceYears: 12,
    bio: "Senior Consultant Cardiologist specializing in preventive cardiology.",
    languages: ["Bangla", "English"],
    applicationStatus: "APPROVED",
    rejectionReason: null,
    videoConsultationFee: 1200,
    specialties: [dummySpecialties[0]],
    chambers: [
      {
        id: "c-1",
        hospitalId: "h-1",
        roomOrUnit: "Room 402, Level 4",
        consultationFee: 1500,
        isActive: true,
        hospital: dummyHospitals[0],
      },
    ],
  };

  it("1. Profile page navigation & routing: DoctorSidebar links to /doctor/profile and highlights when active", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor/profile"]}>
        <DoctorSidebar />
      </MemoryRouter>,
    );

    expect(html).toContain("Profile &amp; Chambers");
    expect(html).toContain('aria-current="page"');
  });

  it("2. DoctorHeader displays Doctor Profile & Chambers title when on /doctor/profile", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor/profile"]}>
        <DoctorHeader onToggleMobile={vi.fn()} isMobileOpen={false} />
      </MemoryRouter>,
    );

    expect(html).toContain("Doctor Profile &amp; Chambers");
    expect(html).toContain("Asia/Dhaka");
  });

  it("3. ProfilePageHeader renders correctly across all 4 approval statuses", () => {
    // A. APPROVED
    const htmlApproved = renderToString(
      <ProfilePageHeader
        profile={baseProfile}
        onSave={vi.fn()}
        onSubmitForReview={vi.fn()}
      />,
    );
    expect(htmlApproved).toContain("Application Approved");
    expect(htmlApproved).toContain("BMDC Registration: #A-54321 (Read-only)");

    // B. PENDING_REVIEW (Read-only mode)
    const pendingProfile: DoctorProfileData = { ...baseProfile, applicationStatus: "PENDING_REVIEW" };
    const htmlPending = renderToString(
      <ProfilePageHeader
        profile={pendingProfile}
        isReadOnly
        onSave={vi.fn()}
        onSubmitForReview={vi.fn()}
      />,
    );
    expect(htmlPending).toContain("Under Administrator Review");
    // Save button should be omitted in read-only mode
    expect(htmlPending).not.toContain("Save Changes");

    // C. REJECTED
    const rejectedProfile: DoctorProfileData = {
      ...baseProfile,
      applicationStatus: "REJECTED",
      rejectionReason: "BMDC credential document image is blurry",
    };
    const htmlRejected = renderToString(
      <ProfilePageHeader
        profile={rejectedProfile}
        canSubmit
        onSave={vi.fn()}
        onSubmitForReview={vi.fn()}
      />,
    );
    expect(htmlRejected).toContain("Revisions Requested");
    expect(htmlRejected).toContain("Submit for Review");

    // D. DRAFT
    const draftProfile: DoctorProfileData = { ...baseProfile, applicationStatus: "DRAFT" };
    const htmlDraft = renderToString(
      <ProfilePageHeader
        profile={draftProfile}
        onSave={vi.fn()}
        onSubmitForReview={vi.fn()}
      />,
    );
    expect(htmlDraft).toContain("Draft Application");
  });

  it("4. ProfileCompletionChecklist shows required items and feedback for draft/rejected doctors", () => {
    const incompleteDraft: DoctorProfileData = {
      ...baseProfile,
      applicationStatus: "DRAFT",
      degrees: null,
      specialties: [],
      videoConsultationFee: null,
      chambers: [],
    };

    const htmlIncomplete = renderToString(
      <ProfileCompletionChecklist
        profile={incompleteDraft}
        hasDegrees={false}
        hasSpecialties={false}
        hasConsultationFee={false}
        canSubmit={false}
        onSubmitForReview={vi.fn()}
      />,
    );

    expect(htmlIncomplete).toContain("0 of 3 Steps Completed");
    expect(htmlIncomplete).toContain("Add medical degrees (e.g. MBBS, FCPS)");
    expect(htmlIncomplete).toContain("Select at least one specialty");
    expect(htmlIncomplete).toContain("Add video consult fee or active chamber");
    expect(htmlIncomplete).toContain("Complete the missing items above before submitting for review.");

    // Complete state
    const htmlComplete = renderToString(
      <ProfileCompletionChecklist
        profile={baseProfile}
        hasDegrees={true}
        hasSpecialties={true}
        hasConsultationFee={true}
        canSubmit={true}
        onSubmitForReview={vi.fn()}
      />,
    );
    // Returns null for APPROVED profile
    expect(htmlComplete).toBe("");

    // Rejected state displays administrator feedback
    const rejectedProfile: DoctorProfileData = {
      ...baseProfile,
      applicationStatus: "REJECTED",
      rejectionReason: "Please provide complete degree institution details.",
    };
    const htmlRejected = renderToString(
      <ProfileCompletionChecklist
        profile={rejectedProfile}
        hasDegrees={true}
        hasSpecialties={true}
        hasConsultationFee={true}
        canSubmit={true}
        onSubmitForReview={vi.fn()}
      />,
    );
    expect(htmlRejected).toContain("Application Revisions Required");
    expect(htmlRejected).toContain("Please provide complete degree institution details.");
  });

  it("5. ProfessionalDetailsSection displays read-only BMDC number and editable fields without fake verification", () => {
    const html = renderToString(
      <ProfessionalDetailsSection
        profile={baseProfile}
        degrees={baseProfile.degrees ?? ""}
        setDegrees={vi.fn()}
        experienceYears={baseProfile.experienceYears}
        setExperienceYears={vi.fn()}
        bio={baseProfile.bio ?? ""}
        setBio={vi.fn()}
        languages={baseProfile.languages}
        setLanguages={vi.fn()}
      />,
    );

    expect(html).toContain("Registered Practitioner");
    expect(html).toContain("BMDC Registration Number");
    expect(html).toContain("#A-54321");
    expect(html).not.toContain("BMDC Verified"); // No fabricated verification claim
    expect(html).toContain("MBBS (DMC), FCPS (Cardiology)");
    expect(html).toContain("Bangla, English");
  });

  it("6. SpecialtiesSelector renders catalog chips and displays selection counter", () => {
    const html = renderToString(
      <SpecialtiesSelector
        specialties={dummySpecialties}
        selectedSpecialtyIds={["s-1"]}
        onToggleSpecialty={vi.fn()}
        onRemoveSpecialty={vi.fn()}
      />,
    );

    expect(html).toContain("Clinical Specialties");
    expect(html).toContain("1 / 10 Selected");
    expect(html).toContain("Cardiology");
    expect(html).toContain("Internal Medicine");
  });

  it("7. ChambersManager renders empty state when no chambers exist", () => {
    const html = renderToString(
      <ChambersManager
        chambers={[]}
        hospitals={dummyHospitals}
        onAddChamber={vi.fn().mockResolvedValue(true)}
        onEditChamber={vi.fn().mockResolvedValue(true)}
        onRemoveChamber={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(html).toContain("No chambers added yet");
    expect(html).toContain("Add Your First Chamber");
  });

  it("8. ChambersManager renders chamber cards with hospital, address, room, and BDT fee", () => {
    const html = renderToString(
      <ChambersManager
        chambers={baseProfile.chambers}
        hospitals={dummyHospitals}
        onAddChamber={vi.fn().mockResolvedValue(true)}
        onEditChamber={vi.fn().mockResolvedValue(true)}
        onRemoveChamber={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(html).toContain("Square Hospital");
    expect(html).toContain("Panthapath");
    expect(html).toContain("Room 402, Level 4");
    expect(html).toContain("৳1500.00");
    expect(html).toContain("Active Chamber");
  });

  it("9. RemoveChamberDialog explains deactivation and re-verification warning before destructive action", () => {
    const html = renderToString(
      <RemoveChamberDialog
        open={true}
        onOpenChange={vi.fn()}
        chamber={baseProfile.chambers[0]}
        onConfirmRemove={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(html).toContain("Remove Practicing Chamber");
    expect(html).toContain("Square Hospital");
    expect(html).toContain("will deactivate future scheduling for this chamber");
    expect(html).toContain("updating your registered chambers will also require administrator re-verification");
    expect(html).toContain("Remove Chamber");
  });

  it("10. ConsultationFeesSection renders video consultation fee input and chamber fees summary", () => {
    const html = renderToString(
      <ConsultationFeesSection
        videoConsultationFee="1200"
        setVideoConsultationFee={vi.fn()}
        chambers={baseProfile.chambers}
      />,
    );

    expect(html).toContain("Telemedicine Video Consultations");
    expect(html).toContain("In-Person Chamber Fees");
    expect(html).toContain("Square Hospital");
    expect(html).toContain("৳1500.00");
  });

  it("11. ReverificationWarningDialog warns APPROVED doctors about returning to DRAFT status", () => {
    const html = renderToString(
      <ReverificationWarningDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain("Profile Update Requires Re-Verification");
    expect(html).toContain("Updating your profile will return your application to");
    expect(html).toContain("Draft");
    expect(html).toContain("Your public listing and booking availability may become unavailable");
    expect(html).toContain("Continue &amp; Save");
  });

  it("12. PublicProfilePreview renders live preview using genuine doctor data without fabricated ratings", () => {
    const html = renderToString(
      <PublicProfilePreview
        profile={baseProfile}
        degrees={baseProfile.degrees ?? ""}
        experienceYears={baseProfile.experienceYears}
        bio={baseProfile.bio ?? ""}
        languages={baseProfile.languages}
        videoConsultationFee="1200"
        specialties={dummySpecialties}
        selectedSpecialtyIds={["s-1"]}
        chambers={baseProfile.chambers}
        hospitals={dummyHospitals}
      />,
    );

    expect(html).toContain("Live Patient Preview");
    expect(html).toContain("Preview Only");
    expect(html).toContain("Dr. Mahmudur Rahman");
    expect(html).toContain("BMDC #A-54321");
    expect(html).toContain("12 yrs experience");
    expect(html).toContain("MBBS (DMC), FCPS (Cardiology)");
    expect(html).toContain("Cardiology");
    expect(html).toContain("৳1200.00");
    expect(html).toContain("Square Hospital");
    expect(html).toContain("৳1500.00");

    // Strictly ensure no fabricated reviews or ratings exist
    expect(html).not.toContain("4.9");
    expect(html).not.toContain("reviews");
    expect(html).not.toContain("★★★★★");
  });
});
