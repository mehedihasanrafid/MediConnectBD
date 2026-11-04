import { expect, test } from "@playwright/test";
import { mockSchedule } from "./fixtures/schedule-cleanup";

test.describe("Hidden schedule actions (synthetic API)", () => {
  test("adds all-day leave and confirms removal, retaining errors in the panel", async ({ page }) => {
    const fixture = await mockSchedule(page);
    await page.goto("/doctor/schedule");
    await page.getByRole("button", { name: "Leave (1)", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Synthetic conference");
    await page.getByRole("button", { name: "Add leave", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Date").fill("2026-11-16");
    await dialog.getByLabel("Reason (optional)").fill("Synthetic study day");
    await dialog.getByRole("button", { name: "Save leave" }).click();
    await expect(dialog).toHaveCount(0);
    expect(fixture.writes[0].body).toEqual({ date: "2026-11-16", startTime: null, endTime: null, reason: "Synthetic study day" });
    await page.getByRole("button", { name: "Leave (2)", exact: true }).click();
    await page.getByRole("button", { name: "Remove leave on 2026-11-16", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Remove leave?" })).toBeVisible();
    expect(fixture.writes).toHaveLength(1);
    fixture.failRemoveLeave = true;
    await dialog.getByRole("button", { name: "Remove leave", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Synthetic save unavailable");
    fixture.failRemoveLeave = false;
    await dialog.getByRole("button", { name: "Remove leave", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Leave (1)", exact: true })).toBeVisible();
  });

  test("partial leave validates times and retains entered values after a failed save", async ({ page }) => {
    const fixture = await mockSchedule(page);
    await page.goto("/doctor/schedule");
    await page.getByRole("button", { name: "Leave (1)", exact: true }).click();
    await page.getByRole("button", { name: "Add leave", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("All day", { exact: true }).uncheck();
    await dialog.getByLabel("End").fill("08:00");
    await dialog.getByRole("button", { name: "Save leave" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Start must be earlier");
    expect(fixture.writes).toHaveLength(0);
    await dialog.getByLabel("End").fill("11:00");
    fixture.failSave = true;
    await dialog.getByRole("button", { name: "Save leave" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Synthetic save unavailable");
    await expect(dialog.getByLabel("End")).toHaveValue("11:00");
    fixture.failSave = false;
    await dialog.getByRole("button", { name: "Save leave" }).click();
    await expect(dialog).toHaveCount(0);
    expect(fixture.writes.at(-1)?.body).toMatchObject({ date: "2026-11-04", startTime: "09:00", endTime: "11:00" });
  });

  test("emergency leave uses Dhaka time and generating slots is an explicit action", async ({ page }) => {
    const fixture = await mockSchedule(page);
    await page.clock.setFixedTime(new Date("2026-11-04T23:15:00Z"));
    await page.goto("/doctor/schedule");
    await page.getByRole("button", { name: "More schedule actions" }).click();
    await page.getByRole("menuitem", { name: "Emergency leave", exact: true }).click();
    await page.getByLabel("Period", { exact: true }).selectOption("two-hours");
    expect(fixture.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Confirm leave", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.writes[0].body).toMatchObject({ date: "2026-11-05", startTime: "05:15", endTime: "07:15" });
    await page.getByRole("button", { name: "More schedule actions" }).click();
    await page.getByRole("menuitem", { name: "Generate 7-day slots" }).click();
    await expect(page.getByRole("status")).toContainText("12 slots");
    expect(fixture.writes.at(-1)?.path).toBe("/doctors/me/slots/generate");
  });

  test("mobile layout and leave drawer fit without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const fixture = await mockSchedule(page);
    await page.goto("/doctor/schedule");
    await expect(page.getByRole("heading", { name: "Weekly hours" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Leave (1)", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Schedule & Leave", exact: true })).toBeFocused();
    expect(fixture.writes).toHaveLength(0);
  });
});
