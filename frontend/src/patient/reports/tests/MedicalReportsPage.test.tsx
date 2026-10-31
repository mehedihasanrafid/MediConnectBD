import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MedicalReportsPage } from "../MedicalReportsPage";

vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "pat-1", roles: ["PATIENT"], phone: "+8801700000000" },
    loading: false,
  }),
}));

vi.mock("../hooks/useMedicalReports", () => ({
  useMedicalReports: () => ({
    reports: [
      {
        id: "rep-1",
        patientProfileId: "prof-1",
        title: "Complete Blood Count",
        fileName: "cbc_report.pdf",
        mimeType: "application/pdf",
        sizeBytes: 154000,
        notes: "Routine quarterly checkup",
        createdAt: "2026-10-30T10:00:00.000Z",
      },
      {
        id: "rep-2",
        patientProfileId: "prof-1",
        title: "Chest X-Ray Digital Scan",
        fileName: "chest_xray.png",
        mimeType: "image/png",
        sizeBytes: 850000,
        notes: null,
        createdAt: "2026-10-29T14:30:00.000Z",
      },
    ],
    loading: false,
    error: null,
    setError: vi.fn(),
    notice: null,
    setNotice: vi.fn(),
    loadReports: vi.fn(),
    handleDelete: vi.fn(),
  }),
}));

describe("MedicalReportsPage Desktop & Responsive Overhaul", () => {
  it("renders breadcrumbs, header, KPI strip, and action toolbar", () => {
    const html = renderToString(
      <MemoryRouter>
        <MedicalReportsPage />
      </MemoryRouter>,
    );

    // Breadcrumbs
    expect(html).toContain("Diagnostic Reports &amp; Labs");
    expect(html).toContain("Encrypted Records");

    // Header
    expect(html).toContain("PATIENT HEALTH VAULT");
    expect(html).toContain("Diagnostic &amp; medical reports");

    // KPI Strip
    expect(html).toContain("Total Stored Reports");
    expect(html).toContain("Vault Storage Used");
    expect(html).toContain("Access Security");
    expect(html).toContain("AES-256 Cloud");

    // Toolbar controls
    expect(html).toContain("Search reports by title, test name, notes...");
    expect(html).toContain("All (<!-- -->2<!-- -->)");
    expect(html).toContain("PDFs (<!-- -->1<!-- -->)");
    expect(html).toContain("Scans/Images (<!-- -->1<!-- -->)");
    expect(html).toContain("+ Upload Diagnostic Report");
  });

  it("renders diagnostic report cards with actions, privacy tag, and docked status bar", () => {
    const html = renderToString(
      <MemoryRouter>
        <MedicalReportsPage />
      </MemoryRouter>,
    );

    // Cards content
    expect(html).toContain("Complete Blood Count");
    expect(html).toContain("cbc_report.pdf");
    expect(html).toContain("Routine quarterly checkup");
    expect(html).toContain("Chest X-Ray Digital Scan");
    expect(html).toContain("chest_xray.png");

    // Actions & Privacy
    expect(html).toContain("Download Report");
    expect(html).toContain("Delete");
    expect(html).toContain("Encrypted · Visible to attending doctors only");

    // Docked Status Bar
    expect(html).toContain("Diagnostic Vault: Online &amp; Synced");
    expect(html).toContain("Upload Limit: 2.0 MB per document");
  });
});
