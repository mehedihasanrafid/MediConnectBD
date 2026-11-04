import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../../features/auth/AuthContext";
import type { PublicUser } from "../../shared/types";
import { MainLayout } from "../MainLayout";
import { PatientLayout } from "../PatientLayout";
import { WebsiteHeader } from "../WebsiteHeader";
import { headerPageTitle, isPublicPage } from "../../shared/navigation/PortalHeader/pageTitles";
import { portalRoleFor } from "../../shared/navigation/PortalHeader/portalHeader.config";

function user(roles: string[]): PublicUser {
  return { id: "header-test", email: "synthetic@example.test", roles,
    firstName: "Synthetic", lastName: "User", status: "ACTIVE",
    patientProfileId: null, doctorProfile: null };
}

function auth(currentUser: PublicUser | null): AuthContextValue {
  return { user: currentUser, loading: false, login: vi.fn(), registerPatient: vi.fn(),
    registerDoctor: vi.fn(), logout: vi.fn() };
}

function renderWebsite(currentUser: PublicUser | null, path: string) {
  return renderToString(<AuthContext.Provider value={auth(currentUser)}>
    <MemoryRouter initialEntries={[path]}><Routes><Route element={<MainLayout />}>
      <Route path="*" element={<div>Website content</div>} />
    </Route></Routes></MemoryRouter>
  </AuthContext.Provider>);
}

describe("Consistent headers on public and patient pages", () => {
  it.each(["PATIENT", "DOCTOR", "ADMIN"])("keeps %s identity on every public page", (role) => {
    for (const path of ["/", "/doctors", "/doctors/example", "/verify-prescription"]) {
      const html = renderWebsite(user([role]), path);
      const label = role[0] + role.slice(1).toLowerCase();
      expect(html).toContain(`aria-label="${label} Utility Header"`);
      expect(html.match(/<header\b/g)).toHaveLength(1);
      expect(html).toContain("Website content");
      expect(html).toContain('aria-label="Account menu for');
      expect(html).toContain('aria-label="Open website navigation"');
      expect(html).not.toContain('aria-label="Toggle theme');
    }
  });

  it("shows guest navigation only when signed out", () => {
    const html = renderWebsite(null, "/");
    expect(html).toContain("Sign in");
    expect(html).toContain("Register");
    expect(html).not.toContain("Utility Header");
  });

  it("avoids flashing a guest header while restoring a session", () => {
    const html = renderToString(<AuthContext.Provider value={{ ...auth(null), loading: true }}>
      <MemoryRouter><WebsiteHeader /></MemoryRouter>
    </AuthContext.Provider>);
    expect(html).toContain("Loading navigation");
    expect(html).not.toContain("Sign in");
  });

  it.each(["/appointments", "/reports", "/prescriptions", "/patient/communication", "/patient/notifications"])(
    "keeps the patient header on %s", (path) => {
      const html = renderToString(<AuthContext.Provider value={auth(user(["PATIENT"]))}>
        <MemoryRouter initialEntries={[path]}><Routes><Route element={<PatientLayout />}>
          <Route path="*" element={<div>Patient content</div>} />
        </Route></Routes></MemoryRouter>
      </AuthContext.Provider>);
      expect(html.match(/<header\b/g)).toHaveLength(1);
      expect(html).toContain('aria-label="Patient Utility Header"');
      expect(html).toContain('aria-label="Open navigation menu"');
      expect(html.replace(/&amp;/g, "&")).toContain(headerPageTitle(path));
    },
  );

  it("uses a stable primary role for accounts with multiple roles", () => {
    expect(portalRoleFor(user(["PATIENT", "DOCTOR", "ADMIN"]))).toBe("ADMIN");
    expect(portalRoleFor(user(["PATIENT", "DOCTOR"]))).toBe("DOCTOR");
  });

  it("classifies the doctor directory as public, while portal pages keep preferences", () => {
    expect(isPublicPage("/doctors")).toBe(true);
    expect(isPublicPage("/doctors/example")).toBe(true);
    expect(isPublicPage("/")).toBe(true);
    for (const path of ["/doctor", "/admin/overview", "/reports", "/patient/communication"]) {
      expect(isPublicPage(path)).toBe(false);
    }
    expect(headerPageTitle("/patient/notifications")).toBe("Notification Center");
  });
});
