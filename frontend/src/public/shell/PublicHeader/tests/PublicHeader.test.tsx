import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PublicUser } from "../../../../shared/types";
import { PublicHeader } from "../PublicHeader";

let mockUser: PublicUser | null = null;
const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    loading: false,
    login: vi.fn(),
    registerPatient: vi.fn(),
    registerDoctor: vi.fn(),
  }),
}));

describe("PublicHeader Mobile & Desktop Navigation (Step 14)", () => {
  it("renders desktop and mobile navigation with accessible menu controls for public visitors", () => {
    mockUser = null;

    const html = renderToString(
      <MemoryRouter initialEntries={["/doctors"]}>
        <PublicHeader />
      </MemoryRouter>,
    );

    // Brand logo
    expect(html).toContain("MediConnect BD");

    // Desktop navigation
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain("Find a doctor");
    expect(html).toContain("Verify prescription");

    // Mobile menu toggle button
    expect(html).toContain('aria-label="Open navigation menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="mobile-navigation"');

    // Mobile navigation drawer & close button
    expect(html).toContain('id="mobile-navigation"');
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('aria-label="Close navigation"');

    // Guest auth actions
    expect(html).toContain("Register");
    expect(html).toContain("Sign in");
  });

  it("renders patient navigation links in both desktop and mobile views for authenticated patients", () => {
    mockUser = {
      id: "patient-1",
      email: "patient@mediconnect.bd",
      roles: ["PATIENT"],
      firstName: "Rahim",
      lastName: "Uddin",
      status: "ACTIVE",
      patientProfileId: "patient-profile-1",
      doctorProfile: null,
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/appointments"]}>
        <PublicHeader />
      </MemoryRouter>,
    );

    // Patient specific navigation links
    expect(html).toContain("My appointments");
    expect(html).toContain("My prescriptions");
    expect(html).toContain("Medical reports");
    expect(html).toContain("Family members");

    // User profile display and sign out
    expect(html).toContain("Rahim Uddin");
    expect(html).toContain("PATIENT");
    expect(html).toContain("Sign out");
  });

  it("renders doctor navigation links for authenticated doctors", () => {
    mockUser = {
      id: "doctor-1",
      email: "doctor@mediconnect.bd",
      roles: ["DOCTOR"],
      firstName: "Dr. Ayesha",
      lastName: "Khan",
      status: "ACTIVE",
      patientProfileId: null,
      doctorProfile: {
        id: "doc-profile-1",
        applicationStatus: "APPROVED",
      },
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/doctor"]}>
        <PublicHeader />
      </MemoryRouter>,
    );

    expect(html).toContain("Dashboard");
    expect(html).toContain("Appointment queue");
    expect(html).toContain("Prescriptions");
    expect(html).toContain("Dr. Ayesha Khan");
    expect(html).toContain("DOCTOR");
  });

  it("renders admin console link for administrator", () => {
    mockUser = {
      id: "admin-1",
      email: "admin@mediconnect.bd",
      roles: ["ADMIN"],
      firstName: "Super",
      lastName: "Admin",
      status: "ACTIVE",
      patientProfileId: null,
      doctorProfile: null,
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/admin/overview"]}>
        <PublicHeader />
      </MemoryRouter>,
    );

    expect(html).toContain("Admin console");
    expect(html).toContain("Super Admin");
    expect(html).toContain("ADMIN");
  });
});
