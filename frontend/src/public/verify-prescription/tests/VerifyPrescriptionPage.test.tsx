import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { VerifyPrescriptionPage } from "../VerifyPrescriptionPage";

describe("VerifyPrescriptionPage with scoped CSS Module (Step 15)", () => {
  it("renders public verification header, code input form, and guidance text", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/verify-prescription"]}>
        <VerifyPrescriptionPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Public Verification");
    expect(html).toContain("Verify prescription");
    expect(html).toContain("Enter a 16-character MediConnect BD verification code");
    expect(html).toContain("Verification code (16 characters)");
    expect(html).toContain('placeholder="e.g. A1B2C3D4E5F6G7H8"');
    expect(html).toContain("Verify");
  });

  it("renders with pre-filled code parameter from search params", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/verify-prescription?code=ABCD1234EFGH5678"]}>
        <VerifyPrescriptionPage />
      </MemoryRouter>,
    );

    expect(html).toContain('value="ABCD1234EFGH5678"');
  });
});
