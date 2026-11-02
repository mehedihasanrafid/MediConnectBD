import { expect, test } from "@playwright/test";

test.describe("Public Homepage Journey", () => {
  test("Visitor searches from homepage, navigates to directory with URL filters, and views Dr. Tanvir Ahmed", async ({
    page,
  }) => {
    // 1. Unauthenticated guest session
    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active session", code: "UNAUTHORIZED" }),
      });
    });

    // 2. Mock catalog
    await page.route("**/api/v1/catalog/specialties", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { id: "s-1", name: "Cardiology", slug: "cardiology" },
            { id: "s-2", name: "Pediatrics", slug: "pediatrics" },
          ],
        }),
      });
    });

    await page.route("**/api/v1/catalog/hospitals", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "h-1",
              name: "Evercare Hospital",
              slug: "evercare-hospital",
              area: "Bashundhara",
              address: "Plot 81, Block E, Bashundhara R/A",
            },
          ],
        }),
      });
    });

    // 3. Mock doctors response
    const mockDoctor = {
      id: "doc-tanvir-1",
      firstName: "Tanvir",
      lastName: "Ahmed",
      degrees: "MBBS, MD (Pediatrics)",
      experienceYears: 9,
      bio: "Child health specialist",
      photoUrl: null,
      languages: ["Bangla", "English"],
      videoConsultationFee: 900,
      minimumFee: 1000,
      averageRating: 4.9,
      reviewCount: 30,
      specialties: [{ id: "s-2", name: "Pediatrics", slug: "pediatrics" }],
      chambers: [
        {
          id: "ch-1",
          roomOrUnit: "Suite 401",
          consultationFee: 1000,
          isActive: true,
          hospital: {
            id: "h-1",
            name: "Evercare Hospital",
            slug: "evercare-hospital",
            area: "Bashundhara",
            address: "Plot 81, Block E, Bashundhara R/A",
          },
        },
      ],
    };

    await page.route("**/api/v1/doctors?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [mockDoctor],
          page: 1,
          limit: 12,
          total: 1,
          totalPages: 1,
        }),
      });
    });

    // Step 1: Open homepage
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("The right doctor, right when you need one.");

    // Verify ThemeToggle is absent for public visitors
    const themeToggle = page.locator('button[aria-label*="Toggle theme"]');
    await expect(themeToggle).toHaveCount(0);

    // Step 2: Enter Tanvir in search query
    await page.fill("#home-search-query", "Tanvir");

    // Step 3: Enter Bashundhara in area
    await page.fill("#home-search-area", "Bashundhara");

    // Step 4: Submit search
    await page.click('button[type="submit"]:has-text("Find doctors")');

    // Step 5: Verify URL parameters
    await expect(page).toHaveURL(/\/doctors\?.*search=Tanvir.*area=Bashundhara/);

    // Step 6: Verify directory filters are populated
    const searchInput = page.locator('input[placeholder="Doctor name or degree"]');
    await expect(searchInput).toHaveValue("Tanvir");

    const areaSelect = page.locator('select:has(option:has-text("All areas"))');
    await expect(areaSelect).toHaveValue("Bashundhara");

    // Step 7: Verify Dr. Tanvir Ahmed is displayed in results
    await expect(page.locator("body")).toContainText("Dr. Tanvir Ahmed");
    await expect(page.locator("body")).toContainText("Pediatrics");
    await expect(page.locator("body")).toContainText("Evercare Hospital");
    await expect(page.locator("body")).toContainText("Bashundhara");
  });
});
