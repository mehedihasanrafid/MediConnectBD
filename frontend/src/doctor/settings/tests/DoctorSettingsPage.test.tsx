import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DoctorSettingsPage } from "../DoctorSettingsPage";
import type { DoctorProfileDetails } from "../../dashboard/types/doctorDashboard.types";

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

vi.mock("../../../shared/theme/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
    preset: "teal",
    setPreset: vi.fn(),
    presets: [
      { id: "aqua", name: "Aqua Water", emoji: "🌊", variableName: "--preset-aqua-primary" },
      { id: "teal", name: "Clinical Teal", emoji: "🌿", variableName: "--preset-teal-primary" },
      { id: "navy", name: "Midnight Navy", emoji: "🌌", variableName: "--preset-navy-primary" },
      { id: "emerald", name: "Emerald Healthcare", emoji: "🌲", variableName: "--preset-emerald-primary" },
    ],
  }),
}));

vi.mock("../../../api/doctors", () => ({
  doctorsApi: {
    getMyProfile: vi.fn().mockResolvedValue({
      id: "doc-1",
      bmdcNumber: "A-54321",
      degrees: "MBBS, FCPS",
      experienceYears: 10,
      bio: "Cardiology consultant",
      languages: ["Bangla", "English"],
      applicationStatus: "APPROVED",
      rejectionReason: null,
      videoConsultationFee: 1200,
      specialties: [{ id: "s1", name: "Cardiology" }],
      chambers: [],
    }),
  },
}));

describe("DoctorSettingsPage (Phase 6)", () => {
  const dummyProfile: DoctorProfileDetails = {
    id: "doc-1",
    bmdcNumber: "A-54321",
    degrees: "MBBS, FCPS",
    experienceYears: 10,
    bio: "Cardiology consultant",
    languages: ["Bangla", "English"],
    applicationStatus: "APPROVED",
    rejectionReason: null,
    videoConsultationFee: 1200,
    specialties: [{ id: "s1", name: "Cardiology" }],
    chambers: [],
  };

  it("renders settings header and breadcrumbs", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorSettingsPage initialProfile={dummyProfile} />
      </MemoryRouter>
    );

    expect(html).toContain("Doctor Account Settings");
    expect(html).toContain("Practice Configuration &amp; Identity");
  });

  it("renders appearance and theme mode controls", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorSettingsPage initialProfile={dummyProfile} />
      </MemoryRouter>
    );

    expect(html).toContain("Interface Theme &amp; Appearance");
    expect(html).toContain("Light Mode");
    expect(html).toContain("Dark Mode");
    expect(html).toContain("System Default");

    // Brand accent presets
    expect(html).toContain("Clinical Teal");
    expect(html).toContain("Aqua Water");
    expect(html).toContain("Midnight Navy");
  });

  it("renders verified doctor identity details and link to clinical profile", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorSettingsPage initialProfile={dummyProfile} />
      </MemoryRouter>
    );

    expect(html).toContain("Dr. Mahmudur Rahman");
    expect(html).toContain("A-54321");
    expect(html).toContain("mahmudur@mediconnect.bd");
    expect(html).toContain("approved");

    // Deep link to clinical profile
    expect(html).toContain('href="/doctor/profile"');
    expect(html).toContain("Manage Clinical Profile");
  });

  it("renders sound chime preview controls and Dhaka timezone badge", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorSettingsPage initialProfile={dummyProfile} />
      </MemoryRouter>
    );

    expect(html).toContain("Clinical Auditory Alerts &amp; Time Synchronization");
    expect(html).toContain("Test Video Call Ring");
    expect(html).toContain("Test Patient Arrival");
    expect(html).toContain("Test Session Complete");
    expect(html).toContain("Test Rx Issuance");
    expect(html).toContain("Dhaka Time Zone Lock (Asia/Dhaka GMT+6)");
  });

  it("renders security overview and session sign-out button", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorSettingsPage initialProfile={dummyProfile} />
      </MemoryRouter>
    );

    expect(html).toContain("Session &amp; Account Security");
    expect(html).toContain("Credential &amp; Single-Sign-On Policy");
    expect(html).toContain("Sign Out of Doctor Session");
    // Ensure no fake change password forms
    expect(html).not.toContain("Enter old password");
    expect(html).not.toContain("Enter new password");
  });
});
