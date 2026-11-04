import { afterEach, describe, expect, it, vi } from "vitest";
import { apiAssetUrl } from "./apiAssetUrl";

afterEach(() => vi.unstubAllEnvs());
describe("Avatar asset URLs", () => {
  const path = "/api/v1/doctors/photos/00000000-0000-4000-8000-000000000099";
  it("keeps uploads on the current origin when using the Vite proxy", () => {
    vi.stubEnv("VITE_API_BASE", "/api/v1");
    expect(apiAssetUrl(path)).toBe(path);
  });
  it("uses the API origin when the frontend and backend are deployed separately", () => {
    vi.stubEnv("VITE_API_BASE", "https://api.example.test/api/v1");
    expect(apiAssetUrl(path)).toBe(`https://api.example.test${path}`);
  });
  it("accepts existing HTTP photos and local previews while rejecting unsafe schemes", () => {
    expect(apiAssetUrl("https://example.test/photo.png")).toContain("https://");
    expect(apiAssetUrl("data:image/webp;base64,AAA=")).toContain("data:image/");
    expect(apiAssetUrl("javascript:alert(1)")).toBeUndefined();
    expect(apiAssetUrl("data:text/html;base64,AAA=")).toBeUndefined();
    expect(apiAssetUrl(null)).toBeUndefined();
  });
});
