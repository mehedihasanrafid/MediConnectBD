import { expect, test } from "@playwright/test";
import { mockProfile } from "./fixtures/profile-workspace";

test.describe("Compact Profile & Chambers (synthetic API)", () => {
  test("shows a concise overview and loads editors and catalogs only on demand", async ({ page }) => {
    const fixture = await mockProfile(page);
    await page.goto("/doctor/profile");
    await expect(page.getByRole("region", { name: "Profile overview" })).toContainText("Synthetic MBBS");
    await expect(page.getByRole("region", { name: "Chambers", exact: true })).toContainText("Room 402");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Unsaved profile changes" })).toHaveCount(0);
    expect(fixture.requests.some((path) => path.includes("/catalog/"))).toBe(false);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Patient preview");
    expect(fixture.writes).toHaveLength(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Profile & Chambers", exact: true })).toBeFocused();
  });
  test("stages edits, confirms approval changes, and saves only changed fields", async ({ page }) => {
    const fixture = await mockProfile(page);
    await page.goto("/doctor/profile");
    await page.getByRole("button", { name: "Edit profile", exact: true }).click();
    await page.getByLabel("Qualifications").fill("Synthetic FCPS");
    await page.getByLabel("Languages", { exact: true }).fill("Bangla, English, Hindi");
    await page.getByRole("button", { name: "Apply changes", exact: true }).click();
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Save approved profile?");
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("region", { name: "Profile overview" })).toContainText("Synthetic FCPS");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await page.getByRole("button", { name: "Save as draft", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.writes[0].body).toEqual({ degrees: "Synthetic FCPS", languages: ["Bangla", "English", "Hindi"] });
    await expect(page.getByRole("region", { name: "Profile overview" })).toContainText("Draft");
    await expect(page.getByRole("region", { name: "Unsaved profile changes" })).toHaveCount(0);
  });
  test("chamber input stays typed, saves once with other changes, and removal is confirmed", async ({ page }) => {
    const fixture = await mockProfile(page, "DRAFT");
    await page.goto("/doctor/profile");
    await page.getByRole("button", { name: "Edit chamber at Synthetic Hospital A", exact: true }).click();
    await page.getByLabel("Room / unit").fill("Room 999");
    await expect(page.getByLabel("Room / unit")).toHaveValue("Room 999");
    await page.getByRole("button", { name: "Apply changes", exact: true }).click();
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("button", { name: "+ Chamber", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Hospital").selectOption("hospital-b");
    await page.getByLabel("Room / unit").fill("Room B");
    await page.getByLabel("Consultation fee (BDT)").fill("0");
    await page.getByRole("button", { name: "Apply changes", exact: true }).click();
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("region", { name: "Unsaved profile changes" })).toHaveCount(0);
    expect(fixture.writes[0].body).toEqual({ chambers: [
      { hospitalId: "hospital-a", roomOrUnit: "Room 999", consultationFee: 1000 },
      { hospitalId: "hospital-b", roomOrUnit: "Room B", consultationFee: 0 },
    ] });
    await page.getByRole("button", { name: "Edit chamber at Synthetic Hospital B", exact: true }).click();
    await page.getByRole("button", { name: "Remove chamber", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Existing appointments remain booked.");
    expect(fixture.writes).toHaveLength(1);
    await page.getByRole("button", { name: "Remove chamber", exact: true }).click();
    await expect(page.getByRole("region", { name: "Chambers", exact: true })).not.toContainText("Synthetic Hospital B");
    expect(fixture.writes).toHaveLength(1);
  });
  test("failed saves keep the draft, discard requires confirmation, and saved profiles can submit", async ({ page }) => {
    const fixture = await mockProfile(page, "DRAFT");
    await page.goto("/doctor/profile");
    await page.getByRole("button", { name: "Edit profile", exact: true }).click();
    await page.getByLabel("Biography").fill("Synthetic changed biography");
    await page.getByRole("button", { name: "Apply changes", exact: true }).click();
    fixture.failSave = true;
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Synthetic save unavailable");
    await expect(page.getByRole("region", { name: "Profile overview" })).toContainText("Synthetic changed biography");
    await page.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Discard changes?");
    await page.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(page.getByRole("region", { name: "Profile overview" })).toContainText("Synthetic biography");
    fixture.failSave = false;
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(page.getByRole("region", { name: "Profile overview" })).toContainText("Under review");
    await expect(page.getByRole("button", { name: "Edit profile", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Change profile photo", exact: true }).or(page.getByRole("button", { name: "Add profile photo", exact: true }))).toBeDisabled();
  });
  test("catalog and profile failures allow retry without clearing existing data", async ({ page }) => {
    const fixture = await mockProfile(page);
    fixture.failLoad = true;
    await page.goto("/doctor/profile");
    await expect(page.getByRole("alert")).toContainText("Synthetic profile unavailable");
    fixture.failLoad = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    fixture.failCatalogs = true;
    await page.getByRole("button", { name: "Edit profile", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Specialties could not be loaded");
    await expect(page.getByRole("button", { name: "✓ Medicine", exact: true })).toBeVisible();
    fixture.failCatalogs = false;
    await page.getByRole("button", { name: "Retry catalogs", exact: true }).click();
    await expect(page.getByRole("button", { name: "Cardiology", exact: true })).toBeVisible();
    expect(fixture.writes).toHaveLength(0);
  });
  test("mobile overview, editors and preview fit without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockProfile(page);
    await page.goto("/doctor/profile");
    await expect(page.getByRole("region", { name: "Profile overview" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Edit profile", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
