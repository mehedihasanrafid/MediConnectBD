import { describe, expect, it } from "vitest";

import { adminSidebarSections } from "./adminSidebar.config";

describe("adminSidebarSections", () => {
  it("defines grouped navigation sections covering all admin console routes", () => {
    const allPaths = adminSidebarSections.flatMap((section) =>
      section.items.map((item) => item.to),
    );

    expect(allPaths).toEqual([
      "/admin/overview",
      "/admin/applications",
      "/admin/catalog",
      "/admin/users",
      "/admin/operations",
      "/admin/notifications",
      "/admin/communication",
      "/doctors",
      "/verify-prescription",
    ]);
  });

  it("marks /admin/overview as exact match", () => {
    const overviewItem = adminSidebarSections[0]?.items[0];
    expect(overviewItem?.to).toBe("/admin/overview");
    expect(overviewItem?.exact).toBe(true);
  });
});
