import { expect, test } from "@playwright/test";
import { mockCommunication } from "./fixtures/communication-expansion";

test.describe("Server-driven direct calls (synthetic API, no real media)", () => {
  test("outgoing voice calls wait for acceptance, enter an audio-only room, and end", async ({ page }) => {
    const fixture = await mockCommunication(page, "DOCTOR");
    await page.goto("/doctor/communication");
    await page.getByRole("button", { name: "Colleagues", exact: true }).click();
    await page.getByRole("button", { name: /Dr. Colleague Peer/ }).click();
    await expect(page.getByRole("button", { name: "Voice call", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Voice call", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Ringing");
    expect(fixture.state.calls[0].media).toBe("AUDIO");
    expect(fixture.state.requests.some((path) => path.endsWith("/room"))).toBe(false);
    fixture.accept();
    await page.clock.runFor(3500);
    await expect(page.getByRole("dialog")).toContainText("Call accepted");
    await page.getByRole("button", { name: "Enter call", exact: true }).click();
    await expect(page.getByTitle("Voice call room")).toHaveAttribute("allow", "microphone; autoplay");
    await page.getByRole("button", { name: "End call", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Call ended");
    await expect(page.getByTitle("Voice call room")).toHaveCount(0);
    expect(fixture.state.calls[0].status).toBe("ENDED");
  });
  test("incoming calls can be declined and missed status comes from the server", async ({ page }) => {
    const fixture = await mockCommunication(page, "PATIENT");
    await page.goto("/patient/communication");
    fixture.incoming();
    await page.clock.runFor(3500);
    await expect(page.getByRole("dialog")).toContainText("Support Agent");
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Call declined");
    expect(fixture.state.calls[0].status).toBe("DECLINED");
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
    const missed = fixture.incoming();
    await page.clock.runFor(3500);
    await expect(page.getByRole("dialog")).toContainText("Someone is calling");
    missed.status = "MISSED";
    await page.clock.runFor(3500);
    await expect(page.getByRole("dialog")).toContainText("Missed call");
    expect(fixture.state.requests.some((path) => path.endsWith("/room"))).toBe(false);
  });
});
