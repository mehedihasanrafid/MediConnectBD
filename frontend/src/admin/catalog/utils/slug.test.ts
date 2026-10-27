import { describe, expect, it } from "vitest";

import { toSlug } from "./slug";

describe("toSlug", () => {
  it("converts specialty and hospital names into clean URL-safe slugs", () => {
    expect(toSlug("  Cardiology & Heart Care  ")).toBe("cardiology-heart-care");
    expect(toSlug("Square Hospitals Ltd (Dhaka)")).toBe("square-hospitals-ltd-dhaka");
  });
});
