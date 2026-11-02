import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ContextualPatientDrawer } from "../ContextualPatientDrawer";
import { doctorsApi } from "../../../../../api/doctors";

vi.mock("../../../../../api/doctors", () => ({
  doctorsApi: {
    getPatientHistory: vi.fn(),
  },
}));

vi.mock("../../../../../api/prescriptions", () => ({
  prescriptionsApi: {
    downloadPdf: vi.fn(),
  },
}));

vi.mock("../../../../../api/reports", () => ({
  reportsApi: {
    downloadReport: vi.fn(),
  },
}));

describe("ContextualPatientDrawer Authorized EHR Inspector", () => {
  it("renders null when patientProfileId is null", () => {
    const html = renderToString(
      <ContextualPatientDrawer patientProfileId={null} onClose={vi.fn()} />,
    );
    expect(html).toBe("");
  });

  it("renders loading state initially when patientProfileId is provided", () => {
    vi.mocked(doctorsApi.getPatientHistory).mockReturnValue(new Promise(() => {}));

    const html = renderToString(
      <ContextualPatientDrawer patientProfileId="patient-123" onClose={vi.fn()} />,
    );

    expect(html).toContain("Authorized Patient History");
    expect(html).toContain("Verifying authorization and loading clinical records…");
  });
});
