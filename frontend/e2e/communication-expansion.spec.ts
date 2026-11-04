import { expect, test } from "@playwright/test";
import { mockCommunication } from "./fixtures/communication-expansion";

test.describe("Consultations, colleagues and support (synthetic API)", () => {
  test("patients start support chats, receive automatic replies, and retain failed drafts", async ({ page }) => {
    const fixture = await mockCommunication(page, "PATIENT", false);
    await page.goto("/patient/communication");
    await page.getByRole("button", { name: "New conversation", exact: true }).click();
    expect(fixture.state.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Start conversation", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Support Agent", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Message", exact: true }).fill("Synthetic support question");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("log")).toContainText("Synthetic support question");
    fixture.reply("Synthetic support answer");
    await page.clock.runFor(6000);
    await expect(page.getByRole("log")).toContainText("Synthetic support answer");
    fixture.state.failSend = true;
    await page.getByRole("textbox", { name: "Message", exact: true }).fill("Keep this draft");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("draft is kept");
    await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("Keep this draft");
    await expect(page.getByRole("button", { name: "Colleagues", exact: true })).toHaveCount(0);
  });
  test("doctors choose eligible colleagues before creating a conversation", async ({ page }) => {
    const fixture = await mockCommunication(page, "DOCTOR", false);
    await page.goto("/doctor/communication");
    await page.getByRole("button", { name: "Colleagues", exact: true }).click();
    await page.getByRole("button", { name: "New conversation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start conversation", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Dr. Colleague Peer", exact: false }).click();
    await page.getByRole("button", { name: "Start conversation", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dr. Colleague Peer", exact: true })).toBeVisible();
    expect(fixture.state.writes[0].body).toEqual({ kind: "COLLEAGUE", recipientId: "colleague-user" });
  });
  test("admin support has a sidebar entry and never loads private consultation chats", async ({ page }) => {
    const fixture = await mockCommunication(page, "ADMIN");
    await page.goto("/admin/communication");
    await expect(page.getByRole("button", { name: "Messages & Support", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: /Support Requester/ }).click();
    await expect(page.getByRole("heading", { name: "Support Requester", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Consultations", exact: true })).toHaveCount(0);
    expect(fixture.state.requests.some((path) => path === "GET /communication/conversations")).toBe(false);
    await page.getByRole("button", { name: "Staff", exact: true }).click();
    await page.getByRole("button", { name: "New conversation", exact: true }).click();
    await page.getByRole("button", { name: /Staff Peer/ }).click();
    await page.getByRole("button", { name: "Start conversation", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Staff Peer", exact: true })).toBeVisible();
  });
  test("family identity, appointment details and doctor photo survive opening a mobile chat", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockCommunication(page, "PATIENT");
    await page.goto("/patient/communication");
    await page.getByRole("button", { name: /Dr. Synthetic Doctor/ }).click();
    const chat = page.getByRole("region", { name: "Conversation", exact: true });
    await expect(chat).toContainText("Synthetic Child");
    await expect(chat.getByRole("img", { name: "Dr. Synthetic Doctor" })).toBeVisible();
    await page.getByRole("button", { name: "Conversation details" }).click();
    await expect(page.getByRole("dialog")).toContainText("Synthetic Child");
    await expect(page.getByRole("dialog")).toContainText("4 Nov 2026");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Back to conversations list" }).click();
    await expect(page.getByRole("button", { name: /Dr. Synthetic Doctor/ })).toBeVisible();
  });
});
