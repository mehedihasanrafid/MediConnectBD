import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ALLOWED_REPORT_MIME_TYPES,
  isAllowedReportMimeType,
  ReportUploadForm,
} from "../components/ReportUploadForm";

describe("ReportUploadForm & Safe Upload Policy", () => {
  it("enforces the allowed document MIME types list", () => {
    // Valid document types
    for (const mime of ALLOWED_REPORT_MIME_TYPES) {
      expect(isAllowedReportMimeType(mime)).toBe(true);
    }

    // Case insensitivity
    expect(isAllowedReportMimeType("APPLICATION/PDF")).toBe(true);
    expect(isAllowedReportMimeType("IMAGE/JPEG")).toBe(true);

    // Unsafe / rejected types
    expect(isAllowedReportMimeType("application/x-msdownload")).toBe(false);
    expect(isAllowedReportMimeType("application/javascript")).toBe(false);
    expect(isAllowedReportMimeType("application/x-sh")).toBe(false);
    expect(isAllowedReportMimeType("application/zip")).toBe(false);
    expect(isAllowedReportMimeType("text/html")).toBe(false);
    expect(isAllowedReportMimeType("video/mp4")).toBe(false);
  });

  it("renders upload form displaying the explicit allowlist of supported formats", () => {
    const html = renderToString(
      <ReportUploadForm
        onUploaded={async () => {}}
        onError={vi.fn()}
        onNotice={vi.fn()}
      />,
    );

    // Form title and fields
    expect(html).toContain("Upload a medical report");
    expect(html).toContain("Report title");
    expect(html).toContain("Notes (optional)");

    // Supported formats notice
    expect(html).toContain("Supported formats: PDF, JPEG, PNG, WEBP, TXT · max 2 MB");
    expect(html).toContain(".pdf");
    expect(html).toContain(".jpg");
    expect(html).toContain(".png");
    expect(html).toContain(".webp");
    expect(html).toContain(".txt");

    // File input accepts allowed MIME types
    expect(html).toContain('accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain"');
  });
});
