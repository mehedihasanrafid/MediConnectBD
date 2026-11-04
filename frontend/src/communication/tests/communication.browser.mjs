// Fully intercepted browser test: no backend reads or writes.
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
try {
  for (const role of ["PATIENT", "DOCTOR"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const user = { id: "test-user", email: "test@example.invalid", firstName: "Test", lastName: "User",
      roles: [role], status: "ACTIVE", patientProfileId: "test-patient",
      doctorProfile: role === "DOCTOR" ? { id: "test-doctor", applicationStatus: "APPROVED" } : null };
    const conversation = { id: "c1", participantId: "counterparty", participantName: "Test Counterparty",
      participantRole: role === "PATIENT" ? "DOCTOR" : "PATIENT", participantSubtitle: "Consultation",
      canSend: true, communicationState: "AVAILABLE", videoAvailable: false,
      lastMessage: "", lastMessageAt: "", linkedConsultation: { appointmentId: "a1" } };
    const expired = { ...conversation, id: "c2", participantName: "Expired Conversation",
      canSend: false, communicationState: "EXPIRED" };
    const wire = (c) => ({ ...c, appointmentId: c.linkedConsultation.appointmentId,
      participant: { userId: c.participantId, name: c.participantName, role: c.participantRole, subtitle: c.participantSubtitle }, lastMessage: null });
    const messages = [];
    let listFailure = false;
    let listForbidden = false;
    let postFailure = false;
    let forbidden = false;
    let postCount = 0;
    await page.route("**/*", async (route) => {
      if (!["fetch", "xhr"].includes(route.request().resourceType())) return route.continue();
      const path = new URL(route.request().url()).pathname;
      const reply = (body, status = 200) => route.fulfill({ status,
        contentType: "application/json", body: JSON.stringify(body) });
      if (path.endsWith("/appointments/a1/video-session")) return reply({ code: "NOT_OPEN", message: "Video room is not yet open." }, 403);
      if (path.endsWith("/auth/refresh")) return reply({ user, accessToken: "intercepted-test-only" });
      if (path.endsWith("/communication/conversations") && listForbidden) return reply({ code: "FORBIDDEN" }, 403);
      if (path.endsWith("/communication/conversations")) return listFailure
        ? reply({ code: "UNAVAILABLE" }, 503) : reply({ items: [wire(conversation), wire(expired)] });
      if (path.endsWith("/conversations/c1")) return forbidden
        ? reply({ code: "FORBIDDEN" }, 403) : reply(wire(conversation));
      if (path.endsWith("/conversations/c2")) return reply(wire(expired));
      if (path.endsWith("/conversations/c2/messages")) return reply({ items: [], nextCursor: null, hasMore: false });
      if (path.endsWith("/conversations/c1/messages")) {
        if (route.request().method() === "GET") return reply({ items: messages, nextCursor: null, hasMore: false });
        postCount++;
        if (postFailure) return reply({ code: "UNAVAILABLE" }, 503);
        const { content } = route.request().postDataJSON();
        const message = { id: `m${postCount}`, conversationId: "c1", senderId: user.id,
          senderName: "Test User", senderRole: role, content, createdAt: new Date().toISOString() };
        messages.push(message);
        return reply(message);
      }
      return reply({ items: [], unreadCount: 0 });
    });
    await page.goto(process.env.COMMUNICATION_TEST_URL ?? "http://127.0.0.1:5173/communication");
    await page.waitForLoadState("networkidle");
    if (errors.length) throw new Error(errors.join("\n"));
    await page.getByRole("button", { name: "Test Counterparty" }).click();
    await expect(page.getByRole("button", { name: "Consultation Messages", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Chat attachments are unavailable");
    await page.keyboard.press("Escape");
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await expect(composer).toBeEnabled();
    await composer.fill("Saved server message");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("log")).toContainText("Saved server message");
    await expect(composer).toHaveValue("");
    if (postCount !== 1) throw new Error("Unexpected duplicate message POST");
    postFailure = true;
    await composer.fill("Keep this draft");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("not confirmed");
    await expect(composer).toHaveValue("Keep this draft");
    await expect(page.getByRole("log")).not.toContainText("Keep this draft");
    await page.getByRole("button", { name: "Expired Conversation" }).click();
    await expect(composer).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("expired");
    await page.getByRole("button", { name: "Test Counterparty" }).click();
    await expect(page.getByRole("log")).toContainText("Saved server message");
    forbidden = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("not authorized");
    await expect(page.getByRole("log")).toHaveCount(0);
    forbidden = false;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(composer).toBeEnabled();
    await expect(page.getByRole("button", { name: "Open video consultation" })).toBeDisabled();
    conversation.videoAvailable = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open video consultation" })).toBeEnabled();
    await page.getByRole("button", { name: "Open video consultation" }).click();
    await expect(page.getByRole("dialog", { name: "Video Consultation", exact: true })).toBeVisible();
    await expect(page.getByText("Video room is not yet open.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close video room" }).click();
    await page.locator("main").evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: `/tmp/communication-${role.toLowerCase()}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Back to conversations list" })).toBeVisible();
    await page.getByRole("button", { name: "Back to conversations list" }).click();
    await expect(page.getByRole("button", { name: "Test Counterparty" })).toBeVisible();
    await page.getByRole("button", { name: "Test Counterparty" }).click();
    await expect(composer).toBeVisible();
    await page.screenshot({ path: `/tmp/communication-${role.toLowerCase()}-mobile.png` });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error("Communication page overflows mobile viewport");
    await page.getByRole("button", { name: "Back to conversations list" }).click();
    listFailure = true;
    await page.getByRole("button", { name: "Refresh conversations" }).click();
    await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
    listFailure = false;
    await page.getByRole("button", { name: "Refresh conversations" }).click();
    await expect(page.getByRole("button", { name: "Test Counterparty" })).toBeVisible();
    listForbidden = true;
    await page.getByRole("button", { name: "Refresh conversations" }).click();
    await expect(page.getByRole("log")).toHaveCount(0);
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(`${role}: history, send, failed draft, expiry, revocation, retry, mobile passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
