import { expect, test } from "@playwright/test";
import { mockPatientDashboard } from "./fixtures/patient-dashboard";

test.describe("Patient-focused doctor dashboard (synthetic API)", () => {
  test("keeps only patient summary and queue, and loads records only on demand", async ({ page }) => {
    const fixture = await mockPatientDashboard(page);
    await page.goto("/doctor");
    await expect(page.getByRole("heading", { name: "Today’s patients" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Next patient: Synthetic Patient A" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Today's patient queue" })).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.getByText("Needs Attention")).toHaveCount(0);
    await expect(main.getByText("Practice Tools & Presets")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.requests.some((path) => /earnings|schedule|specialties|prescriptions|history/.test(path))).toBe(false);
    await main.getByRole("button", { name: "History & reports", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("No medical reports uploaded by this patient.")).toBeVisible();
    expect(fixture.requests.filter((path) => path.includes("/history")).length).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Today’s patients" })).toBeFocused();
  });

  test("selects another patient and does not load owner history for a family beneficiary", async ({ page }) => {
    const fixture = await mockPatientDashboard(page);
    await page.goto("/doctor");
    await page.getByRole("button", { name: "Open patient Synthetic Patient B", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Synthetic Patient B", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Selected patient: Synthetic Patient B" })).toBeVisible();
    await page.getByRole("button", { name: "Open patient Synthetic Child", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "History & reports", exact: true }).click();
    await expect(page.getByText("Separate family-member history is not available", { exact: false })).toBeVisible();
    expect(fixture.requests.filter((path) => path.includes("/history"))).toHaveLength(0);
    await page.keyboard.press("Escape");
    const card = page.getByRole("region", { name: "Selected patient: Synthetic Child" });
    await expect(card).not.toContainText("32 years");
  });

  test("readiness is neutral and joining verifies authorization without a real provider", async ({ page }) => {
    const fixture = await mockPatientDashboard(page);
    await page.goto("/doctor");
    await page.getByRole("button", { name: "Video readiness unavailable for Synthetic Patient A. Open details.", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Video readiness unavailable" })).toBeVisible();
    expect(fixture.requests.some((path) => path.includes("video-session"))).toBe(false);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Join video", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Video provider unavailable for test");
    await page.keyboard.press("Escape");
    expect(fixture.mutations()).toBe(0);
  });

  test("opening tools never mutates an appointment; completion requires confirmation", async ({ page }) => {
    const fixture = await mockPatientDashboard(page);
    await page.goto("/doctor");
    await page.getByRole("button", { name: "Consultation tools", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mark completed", exact: true }).click();
    expect(fixture.mutations()).toBe(0);
    await page.getByRole("button", { name: "Confirm: Mark completed", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.mutations()).toBe(1);
    await expect(page.getByRole("region", { name: "Next patient: Synthetic Patient B" })).toBeVisible();
  });

  test("appointment message link opens only its matching authorized conversation", async ({ page }) => {
    await mockPatientDashboard(page);
    await page.goto("/doctor");
    await page.getByRole("button", { name: "Consultation tools", exact: true }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Consultation messages", exact: true }).click();
    await expect(page).toHaveURL(/doctor\/communication\?appointmentId=appointment-a/);
    await expect(page.getByText("No messages yet in this conversation.", { exact: true })).toBeVisible();
  });

  test("failed appointment loading shows an error instead of a false empty queue", async ({ page }) => {
    await mockPatientDashboard(page, true);
    await page.goto("/doctor");
    await expect(page.getByRole("alert")).toContainText("Appointment service unavailable");
    await expect(page.getByText("No patients remaining today")).toHaveCount(0);
    await expect(page.getByLabel("Today's appointment counts")).toHaveCount(0);
  });

  test("fits a mobile screen and opens its patient panel without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPatientDashboard(page);
    await page.goto("/doctor");
    await expect(page.getByRole("region", { name: "Next patient: Synthetic Patient A" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Patient details", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Close patient panel", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
