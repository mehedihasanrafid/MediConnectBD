import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { FamilyMembersPage } from "../FamilyMembersPage";

vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "pat-1", roles: ["PATIENT"], phone: "+8801700000000" },
    loading: false,
  }),
}));

vi.mock("../../../shared/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      items: [
        {
          id: "fam-1",
          patientProfileId: "prof-1",
          name: "Sultana Rahman",
          relationship: "Mother",
          dateOfBirth: "1965-04-12",
          phone: "+8801711223344",
        },
      ],
    }),
    post: vi.fn(),
    delete: vi.fn(),
  },
  ApiRequestError: class extends Error {},
}));

describe("FamilyMembersPage Desktop & Responsive Overhaul", () => {
  it("renders breadcrumbs, page header, KPI strip, add form, and status bar", () => {
    const html = renderToString(
      <MemoryRouter>
        <FamilyMembersPage />
      </MemoryRouter>,
    );

    // Breadcrumbs
    expect(html).toContain("Family Circle &amp; Dependents");
    expect(html).toContain("Encrypted Records");

    // Header
    expect(html).toContain("PATIENT ACCOUNT &amp; CARE CIRCLE");
    expect(html).toContain("Family members &amp; dependents");

    // KPI
    expect(html).toContain("Registered Dependents");
    expect(html).toContain("Care Booking Access");

    // Form
    expect(html).toContain("Add a family member");
    expect(html).toContain("Full name");
    expect(html).toContain("Relationship");

    // Status Bar
    expect(html).toContain("Family Circle: Synced");
    expect(html).toContain("Proxy Booking &amp; Prescription Access Active");
  });
});
