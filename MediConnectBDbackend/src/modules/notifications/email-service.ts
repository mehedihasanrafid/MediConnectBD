/**
 * Email service implementation — composes messages and delegates to a transport.
 */

import type { EmailService, EmailTransport } from "./email.types";

export class DefaultEmailService implements EmailService {
  constructor(private readonly transport: EmailTransport) {}

  async sendBookingConfirmation(
    to: string,
    appointmentId: string,
    doctorName: string,
    scheduledAt: Date,
    feeAmount: number,
  ): Promise<void> {
    const formattedDate = scheduledAt.toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
      dateStyle: "medium",
      timeStyle: "short",
    });

    await this.transport.send({
      to,
      subject: `Booking Confirmed — MediConnect BD`,
      html: buildConfirmationHtml(doctorName, formattedDate, feeAmount),
      text: `Booking confirmed with Dr. ${doctorName} on ${formattedDate}. Fee: BDT ${feeAmount.toFixed(2)}`,
    });
  }

  async sendReminder(
    to: string,
    _appointmentId: string,
    doctorName: string,
    scheduledAt: Date,
  ): Promise<void> {
    const formattedDate = scheduledAt.toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
      dateStyle: "medium",
      timeStyle: "short",
    });

    await this.transport.send({
      to,
      subject: `Reminder: Appointment Tomorrow — MediConnect BD`,
      html: buildReminderHtml(doctorName, formattedDate),
      text: `Reminder: Your appointment with Dr. ${doctorName} is scheduled for ${formattedDate}.`,
    });
  }
}

function buildConfirmationHtml(
  doctorName: string,
  formattedDate: string,
  feeAmount: number,
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Booking Confirmed</h2>
      <p>Your appointment has been confirmed.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Doctor</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">Dr. ${escapeHtml(doctorName)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Date & Time</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(formattedDate)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Fee</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">BDT ${feeAmount.toFixed(2)}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 14px;">Thank you for choosing MediConnect BD.</p>
    </div>
  `;
}

function buildReminderHtml(
  doctorName: string,
  formattedDate: string,
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Appointment Reminder</h2>
      <p>This is a reminder about your upcoming appointment.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Doctor</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">Dr. ${escapeHtml(doctorName)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Date & Time</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(formattedDate)}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 14px;">Please arrive 10 minutes early for in-person visits.</p>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
