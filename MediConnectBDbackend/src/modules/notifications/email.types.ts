/**
 * Types for the email notification system.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

export interface EmailService {
  sendBookingConfirmation(
    to: string,
    appointmentId: string,
    doctorName: string,
    scheduledAt: Date,
    feeAmount: number,
  ): Promise<void>;
  sendReminder(
    to: string,
    appointmentId: string,
    doctorName: string,
    scheduledAt: Date,
  ): Promise<void>;
}
