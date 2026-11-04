import { expect, test, type Page } from "@playwright/test";
import { mockProfile, photoPng, uploadedPhotoUrl } from "./fixtures/profile-workspace";

async function stagePhoto(page: Page) {
  await page.getByRole("button", { name: "Add profile photo", exact: true }).click();
  await page.getByLabel("Choose photo").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: photoPng });
  await expect(page.getByRole("img", { name: "Profile photo crop preview" })).toBeVisible();
  await page.getByLabel("Zoom", { exact: true }).fill("1.5");
  await page.getByRole("button", { name: "Use photo", exact: true }).click();
}
test.describe("Doctor profile photo (synthetic API)", () => {
  test("crops a photo, saves after confirmation, and displays it consistently after reload", async ({ page }) => {
    const fixture = await mockProfile(page);
    await page.goto("/doctor/profile");
    await stagePhoto(page);
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Save as draft", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.writes.map((entry) => entry.path)).toEqual(["/doctors/me/photo", "/doctors/me"]);
    expect(fixture.writes[0].body.mimeType).toBe("image/webp");
    expect(fixture.writes[0].body.contentBase64.length).toBeGreaterThan(20);
    expect(fixture.writes[1].body).toEqual({ photoUrl: uploadedPhotoUrl });
    await expect(page.getByRole("img", { name: "Dr. Synthetic Doctor", exact: true })).toHaveCount(3);
    await page.reload();
    await expect(page.getByRole("region", { name: "Profile overview" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Dr. Synthetic Doctor", exact: true })).toHaveCount(3);
    for (const image of await page.getByRole("img", { name: "Dr. Synthetic Doctor", exact: true }).all()) {
      await expect(image).toHaveAttribute("src", uploadedPhotoUrl);
    }
  });
  test("rejects unsupported and oversized files before any HTTP upload", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const fixture = await mockProfile(page);
    await page.goto("/doctor/profile");
    await page.getByRole("button", { name: "Add profile photo", exact: true }).click();
    await page.getByLabel("Choose photo").setInputFiles({ name: "synthetic.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
    await expect(page.getByRole("alert")).toContainText("Choose a JPG, PNG or WebP");
    await page.getByLabel("Choose photo").setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
    await expect(page.getByRole("alert")).toContainText("2 MB or smaller");
    await expect(page.getByRole("button", { name: "Use photo", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(fixture.writes).toHaveLength(0);
  });
  test("keeps drafts on upload/save failures and reuses an uploaded asset when retrying", async ({ page }) => {
    const fixture = await mockProfile(page);
    await page.goto("/doctor/profile");
    await stagePhoto(page);
    fixture.failPhoto = true;
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await page.getByRole("button", { name: "Save as draft", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Synthetic photo unavailable");
    expect(fixture.writes.filter((entry) => entry.method === "PATCH")).toHaveLength(0);
    fixture.failPhoto = false; fixture.failSave = true;
    await page.getByRole("button", { name: "Save as draft", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Synthetic save unavailable");
    expect(fixture.writes.filter((entry) => entry.path.endsWith("/photo"))).toHaveLength(2);
    fixture.failSave = false;
    await page.getByRole("button", { name: "Save as draft", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.writes.filter((entry) => entry.path.endsWith("/photo"))).toHaveLength(2);
    await expect(page.getByRole("img", { name: "Dr. Synthetic Doctor", exact: true })).toHaveCount(3);
  });
  test("removes an existing photo through the same confirmed save flow", async ({ page }) => {
    const fixture = await mockProfile(page);
    fixture.profile.photoUrl = uploadedPhotoUrl;
    await page.goto("/doctor/profile");
    await page.getByRole("button", { name: "Change profile photo", exact: true }).click();
    await page.getByRole("button", { name: "Remove photo", exact: true }).click();
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await page.getByRole("button", { name: "Save as draft", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0].body).toEqual({ photoUrl: null });
    await expect(page.getByRole("img", { name: "Dr. Synthetic Doctor", exact: true })).toHaveCount(0);
  });
});
