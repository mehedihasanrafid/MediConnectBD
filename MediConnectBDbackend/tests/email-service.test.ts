import { beforeEach, describe, expect, it } from "vitest";
import { DefaultEmailService } from "../src/modules/notifications/email-service";
import type { EmailTransport } from "../src/modules/notifications/email.types";

describe("DefaultEmailService", () => {
  const sentMessages: { to: string; subject: string; html: string }[] = [];

  const mockTransport: EmailTransport = {
    async send(message) {
      sentMessages.push({
        to: message.to,
        subject: message.subject,
        html: message.html,
      });
    },
  };

  beforeEach(() => {
    sentMessages.length = 0;
  });

  it("sends a booking confirmation email with correct details", async () => {
    const service = new DefaultEmailService(mockTransport);
    const scheduledAt = new Date("2026-11-01T10:00:00Z");

    await service.sendBookingConfirmation(
      "patient@example.com",
      "apt-123",
      "Ahmed",
      scheduledAt,
      800,
    );

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].to).toBe("patient@example.com");
    expect(sentMessages[0].subject).toContain("Booking Confirmed");
    expect(sentMessages[0].html).toContain("Dr. Ahmed");
    expect(sentMessages[0].html).toContain("800.00");
  });

  it("sends a reminder email with correct details", async () => {
    const service = new DefaultEmailService(mockTransport);
    const scheduledAt = new Date("2026-11-01T10:00:00Z");

    await service.sendReminder(
      "patient@example.com",
      "apt-123",
      "Ahmed",
      scheduledAt,
    );

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].to).toBe("patient@example.com");
    expect(sentMessages[0].subject).toContain("Reminder");
    expect(sentMessages[0].html).toContain("Dr. Ahmed");
  });

  it("escapes HTML in doctor names", async () => {
    const service = new DefaultEmailService(mockTransport);
    const scheduledAt = new Date("2026-11-01T10:00:00Z");

    await service.sendBookingConfirmation(
      "patient@example.com",
      "apt-123",
      "<script>alert('xss')</script>",
      scheduledAt,
      800,
    );

    expect(sentMessages[0].html).not.toContain("<script>");
    expect(sentMessages[0].html).toContain("&lt;script&gt;");
  });
});
