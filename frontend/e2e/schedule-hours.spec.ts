import { expect, test } from "@playwright/test";
import { mockSchedule } from "./fixtures/schedule-cleanup";

test.describe("Concise doctor schedule (synthetic API)", () => {
  test("shows a readable week, filters modes, and keeps secondary content hidden", async ({ page }) => {
    const fixture = await mockSchedule(page);
    await page.goto("/doctor/schedule");
    await expect(page.getByRole("heading", { name: "Weekly hours" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Sunday", exact: true })).toContainText("09:00–12:00");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Synthetic conference")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove hours", exact: true })).toHaveCount(0);
    await expect(page.getByRole("menuitem")).toHaveCount(0);
    await page.getByLabel("Filter schedule by consultation mode").selectOption("CHAMBER");
    await expect(page.getByRole("region", { name: "Sunday", exact: true })).toContainText("No hours");
    await expect(page.getByRole("region", { name: "Monday", exact: true })).toContainText("Room 402");
    expect(fixture.writes).toHaveLength(0);
  });

  test("editing preserves the other hours and displays full chamber details on demand", async ({ page }) => {
    const fixture = await mockSchedule(page);
    await page.goto("/doctor/schedule");
    await page.getByRole("button", { name: /Edit Monday/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Synthetic road");
    await expect(dialog.getByLabel("Appointment length")).toHaveValue("20");
    await dialog.getByLabel("Start").fill("18:00");
    await dialog.getByRole("button", { name: "Save hours" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Schedule & Leave", exact: true })).toBeFocused();
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0].body.rules).toEqual([
      { dayOfWeek: 0, startTime: "09:00", endTime: "12:00", slotDurationMinutes: 15, mode: "VIDEO" },
      { dayOfWeek: 1, startTime: "18:00", endTime: "21:00", slotDurationMinutes: 20, mode: "CHAMBER", chamberId: "chamber" },
    ]);
  });

  test("invalid periods and overlaps do not send requests; valid new hours save", async ({ page }) => {
    const fixture = await mockSchedule(page);
    await page.goto("/doctor/schedule");
    await page.getByRole("button", { name: "Hours", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Start").fill("22:00");
    await dialog.getByRole("button", { name: "Save hours" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Start must be earlier");
    await dialog.getByLabel("Start").fill("18:00");
    await dialog.getByRole("button", { name: "Save hours" }).click();
    await expect(dialog.getByRole("alert")).toContainText("overlap");
    expect(fixture.writes).toHaveLength(0);
    await dialog.getByLabel("Day").selectOption("2");
    await dialog.getByRole("button", { name: "Save hours" }).click();
    await expect(dialog).toHaveCount(0);
    expect(fixture.writes[0].body.rules).toHaveLength(3);
  });

  test("removal requires confirmation and keeps the dialog open on server failure", async ({ page }) => {
    const fixture = await mockSchedule(page);
    await page.goto("/doctor/schedule");
    await page.getByRole("button", { name: /Edit Sunday/ }).click();
    await page.getByRole("button", { name: "Remove hours", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Existing appointments remain booked");
    expect(fixture.writes).toHaveLength(0);
    fixture.failSave = true;
    await page.getByRole("button", { name: "Remove hours", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Synthetic save unavailable");
    fixture.failSave = false;
    await page.getByRole("button", { name: "Remove hours", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.schedule.rules).toHaveLength(1);
    expect(fixture.schedule.rules[0].mode).toBe("CHAMBER");
  });

  test("service errors show a retry instead of a false empty week", async ({ page }) => {
    const fixture = await mockSchedule(page, true);
    await page.goto("/doctor/schedule");
    await expect(page.getByRole("alert")).toContainText("Schedule service unavailable");
    await expect(page.getByRole("heading", { name: "Weekly hours" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Hours", exact: true })).toHaveCount(0);
    fixture.failLoad = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Weekly hours" })).toBeVisible();
  });
});
